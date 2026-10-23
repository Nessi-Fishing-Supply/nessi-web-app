import { NextResponse } from 'next/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { requireShopPermission } from '@/libs/shop-permissions';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';

// Revokes a pending shop invite so it can no longer be accepted.
export async function DELETE(
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
    const { data: invite, error: fetchError } = await admin
      .from('shop_invites')
      .select('id, status')
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
        { error: 'Only pending invites can be revoked' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { error: updateError } = await admin
      .from('shop_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
