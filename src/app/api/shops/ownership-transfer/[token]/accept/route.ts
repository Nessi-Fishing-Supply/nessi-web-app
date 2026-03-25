import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { SYSTEM_ROLE_IDS } from '@/features/shops/constants/roles';

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: AUTH_CACHE_HEADERS },
    );
  }

  const admin = createAdminClient();

  const { data: transfer, error: transferError } = await admin
    .from('shop_ownership_transfers')
    .select('*, shops(shop_name)')
    .eq('token', token)
    .maybeSingle();

  if (transferError) {
    return NextResponse.json(
      { error: transferError.message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (!transfer || transfer.status !== 'pending') {
    return NextResponse.json(
      { error: 'Transfer not found' },
      { status: 404, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (new Date(transfer.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'This transfer request has expired', code: 'TRANSFER_EXPIRED' },
      { status: 410, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (user.id !== transfer.to_member_id) {
    return NextResponse.json(
      { error: 'You are not the intended recipient of this transfer', code: 'WRONG_USER' },
      { status: 403, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Perform atomic ownership swap:
  // 1. Update shops.owner_id
  // 2. Promote new owner to Owner role
  // 3. Demote old owner to Manager role
  // 4. Mark transfer as accepted
  const [shopUpdate, newOwnerRoleUpdate, oldOwnerRoleUpdate, transferUpdate] = await Promise.all([
    admin.from('shops').update({ owner_id: transfer.to_member_id }).eq('id', transfer.shop_id),
    admin
      .from('shop_members')
      .update({ role_id: SYSTEM_ROLE_IDS.OWNER })
      .eq('shop_id', transfer.shop_id)
      .eq('member_id', transfer.to_member_id),
    admin
      .from('shop_members')
      .update({ role_id: SYSTEM_ROLE_IDS.MANAGER })
      .eq('shop_id', transfer.shop_id)
      .eq('member_id', transfer.from_member_id),
    admin.from('shop_ownership_transfers').update({ status: 'accepted' }).eq('id', transfer.id),
  ]);

  if (shopUpdate.error) {
    return NextResponse.json(
      { error: `Failed to transfer ownership: ${shopUpdate.error.message}` },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (newOwnerRoleUpdate.error) {
    return NextResponse.json(
      { error: `Failed to update new owner role: ${newOwnerRoleUpdate.error.message}` },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (oldOwnerRoleUpdate.error) {
    return NextResponse.json(
      { error: `Failed to update previous owner role: ${oldOwnerRoleUpdate.error.message}` },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (transferUpdate.error) {
    console.error('Failed to mark transfer as accepted:', transferUpdate.error.message);
  }

  const shops = transfer.shops as { shop_name: string } | null;

  return NextResponse.json(
    { success: true, shopId: transfer.shop_id, shopName: shops?.shop_name ?? '' },
    { headers: AUTH_CACHE_HEADERS },
  );
}
