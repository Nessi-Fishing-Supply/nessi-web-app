import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { requireShopPermission } from '@/libs/shop-permissions';
import { sendEmail } from '@/features/email/services/send-email';
import { ownershipTransferRequest } from '@/features/email/templates/ownership-transfer';

// Initiates a shop ownership transfer by sending a confirmation email to the new owner.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await params;

  const result = await requireShopPermission(request, 'members', 'full', {
    expectedShopId: shopId,
  });
  if (result instanceof NextResponse) return result;

  let newOwnerId: string;
  try {
    const body = await request.json();
    newOwnerId = body.newOwnerId;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (!newOwnerId) {
    return NextResponse.json(
      { error: 'newOwnerId is required' },
      { status: 400, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (newOwnerId === result.user.id) {
    return NextResponse.json(
      { error: 'Cannot transfer ownership to yourself' },
      { status: 400, headers: AUTH_CACHE_HEADERS },
    );
  }

  const admin = createAdminClient();

  // Verify newOwnerId is already a shop member
  const { data: newOwnerMember } = await admin
    .from('shop_members')
    .select('member_id')
    .eq('shop_id', shopId)
    .eq('member_id', newOwnerId)
    .single();

  if (!newOwnerMember) {
    return NextResponse.json(
      { error: 'New owner must already be a member of the shop' },
      { status: 400, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Check for existing pending transfer
  const { data: existingTransfer } = await admin
    .from('shop_ownership_transfers')
    .select('id')
    .eq('shop_id', shopId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (existingTransfer) {
    return NextResponse.json(
      { error: 'A pending ownership transfer already exists for this shop' },
      { status: 409, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Create the transfer record
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await admin.from('shop_ownership_transfers').insert({
    shop_id: shopId,
    from_member_id: result.user.id,
    to_member_id: newOwnerId,
    token,
    expires_at: expiresAt,
  });

  if (insertError) {
    return NextResponse.json(
      { error: `Failed to create transfer request: ${insertError.message}` },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Look up transferee email, owner name, and shop name for the email
  try {
    const [userResult, ownerResult, shopResult] = await Promise.all([
      admin.auth.admin.getUserById(newOwnerId),
      admin.from('members').select('first_name, last_name').eq('id', result.user.id).single(),
      admin.from('shops').select('shop_name').eq('id', shopId).single(),
    ]);

    const transfereeEmail = userResult.data.user?.email;
    const ownerName = ownerResult.data
      ? `${ownerResult.data.first_name} ${ownerResult.data.last_name}`.trim()
      : 'Shop Owner';
    const shopName = shopResult.data?.shop_name ?? 'your shop';

    if (transfereeEmail) {
      const { subject, html } = ownershipTransferRequest({ shopName, ownerName, token });
      await sendEmail({ to: transfereeEmail, subject, html });
    }
  } catch (emailError) {
    console.error('Failed to send ownership transfer email:', emailError);
  }

  return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
}
