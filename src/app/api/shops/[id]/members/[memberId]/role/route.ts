import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { requireShopPermission } from '@/libs/shop-permissions';
import { SYSTEM_ROLE_IDS } from '@/features/shops/constants/roles';

// Changes the role assigned to a shop member.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id: shopId, memberId } = await params;

  const result = await requireShopPermission(request, 'members', 'full', {
    expectedShopId: shopId,
  });

  if (result instanceof NextResponse) return result;

  const body = await request.json().catch(() => null);
  const roleId: string | undefined = body?.roleId;

  if (!roleId) {
    return NextResponse.json(
      { error: 'roleId is required' },
      { status: 400, headers: AUTH_CACHE_HEADERS },
    );
  }

  const admin = createAdminClient();

  // Check target member exists and get their current role
  const { data: membership, error: membershipError } = await admin
    .from('shop_members')
    .select('member_id, role_id, shop_roles(slug, is_system)')
    .eq('shop_id', shopId)
    .eq('member_id', memberId)
    .single();

  if (membershipError || !membership) {
    return NextResponse.json(
      { error: 'Member not found' },
      { status: 404, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Check if target member is the Owner
  const currentRole = Array.isArray(membership.shop_roles)
    ? membership.shop_roles[0]
    : membership.shop_roles;

  if (currentRole?.is_system && currentRole?.slug === 'owner') {
    return NextResponse.json(
      { error: "Cannot change the owner's role" },
      { status: 400, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Check if requested roleId is the Owner system role
  if (roleId === SYSTEM_ROLE_IDS.OWNER) {
    return NextResponse.json(
      { error: 'Cannot assign the owner role' },
      { status: 400, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Validate roleId exists and belongs to this shop or is a system role
  const { data: role, error: roleError } = await admin
    .from('shop_roles')
    .select('id, name')
    .eq('id', roleId)
    .or(`shop_id.eq.${shopId},is_system.eq.true`)
    .single();

  if (roleError || !role) {
    return NextResponse.json(
      { error: 'Invalid role' },
      { status: 400, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Update the member's role
  const { error: updateError } = await admin
    .from('shop_members')
    .update({ role_id: roleId })
    .eq('shop_id', shopId)
    .eq('member_id', memberId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  return NextResponse.json({ success: true, roleName: role.name }, { headers: AUTH_CACHE_HEADERS });
}
