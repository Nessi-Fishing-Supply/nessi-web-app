import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { SYSTEM_ROLE_IDS } from '@/features/shops/types/shop';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await params;

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

  const admin = createAdminClient();

  // Verify current user is the shop owner
  const { data: shop } = await admin
    .from('shops')
    .select('owner_id')
    .eq('id', shopId)
    .is('deleted_at', null)
    .single();

  if (!shop) {
    return NextResponse.json(
      { error: 'Shop not found' },
      { status: 404, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (shop.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_CACHE_HEADERS });
  }

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

  // Atomically update ownership: shops.owner_id, new owner role_id → Owner, current owner role_id → Manager
  const [shopUpdate, newOwnerRoleUpdate, currentOwnerRoleUpdate] = await Promise.all([
    admin.from('shops').update({ owner_id: newOwnerId }).eq('id', shopId),
    admin
      .from('shop_members')
      .update({ role_id: SYSTEM_ROLE_IDS.OWNER })
      .eq('shop_id', shopId)
      .eq('member_id', newOwnerId),
    admin
      .from('shop_members')
      .update({ role_id: SYSTEM_ROLE_IDS.MANAGER })
      .eq('shop_id', shopId)
      .eq('member_id', user.id),
  ]);

  if (shopUpdate.error) {
    return NextResponse.json(
      { error: `Failed to transfer shop ownership: ${shopUpdate.error.message}` },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (newOwnerRoleUpdate.error) {
    return NextResponse.json(
      { error: `Failed to update new owner role: ${newOwnerRoleUpdate.error.message}` },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (currentOwnerRoleUpdate.error) {
    return NextResponse.json(
      { error: `Failed to update previous owner role: ${currentOwnerRoleUpdate.error.message}` },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
}
