import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { SYSTEM_ROLE_IDS } from '@/features/shops/constants/roles';

// Accepts a shop ownership transfer, making the recipient the new owner.
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

  // Perform atomic ownership swap via database function (single transaction)
  const { error: rpcError } = await admin.rpc('accept_ownership_transfer', {
    p_transfer_id: transfer.id,
    p_shop_id: transfer.shop_id,
    p_from_member_id: transfer.from_member_id,
    p_to_member_id: transfer.to_member_id,
    p_owner_role_id: SYSTEM_ROLE_IDS.OWNER,
    p_manager_role_id: SYSTEM_ROLE_IDS.MANAGER,
  });

  if (rpcError) {
    return NextResponse.json(
      { error: `Failed to transfer ownership: ${rpcError.message}` },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  const shops = transfer.shops as { shop_name: string } | null;

  return NextResponse.json(
    { success: true, shopId: transfer.shop_id, shopName: shops?.shop_name ?? '' },
    { headers: AUTH_CACHE_HEADERS },
  );
}
