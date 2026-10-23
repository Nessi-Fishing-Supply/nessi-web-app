import { NextResponse } from 'next/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { requireShopPermission } from '@/libs/shop-permissions';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { sendEmail } from '@/features/email/services/send-email';
import { inviteToShop } from '@/features/email/templates/invite-to-shop';

// Resends a shop invite email with a refreshed token and expiry.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
) {
  const { id: shopId, inviteId } = await params;

  const result = await requireShopPermission(request, 'members', 'full', {
    expectedShopId: shopId,
  });
  if (result instanceof NextResponse) return result;

  const admin = createAdminClient();

  try {
    // Fetch the invite
    const { data: invite, error: fetchError } = await admin
      .from('shop_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('shop_id', shopId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending invites can be resent' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Regenerate token and reset expiry to 7 days from now
    const newToken = crypto.randomUUID();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: updatedInvite, error: updateError } = await admin
      .from('shop_invites')
      .update({ expires_at: newExpiresAt, token: newToken })
      .eq('id', inviteId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Get shop name, inviter name, and role name for email
    const [{ data: shop }, { data: inviter }, { data: role }] = await Promise.all([
      admin.from('shops').select('shop_name').eq('id', shopId).single(),
      admin.from('members').select('first_name, last_name').eq('id', result.user.id).single(),
      admin.from('shop_roles').select('name').eq('id', invite.role_id).single(),
    ]);

    // Resend email (failure does not block response)
    if (shop && inviter && role) {
      const inviterName =
        `${inviter.first_name ?? ''} ${inviter.last_name ?? ''}`.trim() || 'A shop member';
      const template = inviteToShop({
        shopName: shop.shop_name,
        inviterName,
        roleName: role.name,
        token: newToken,
      });
      try {
        await sendEmail({ to: invite.email, ...template });
      } catch (emailError) {
        console.error('[api/shops/invites/resend] Failed to resend invite email', {
          error: String(emailError),
          inviteId,
        });
      }
    }

    return NextResponse.json(updatedInvite, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
