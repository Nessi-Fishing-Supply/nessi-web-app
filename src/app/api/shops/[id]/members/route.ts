import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { requireShopPermission } from '@/libs/shop-permissions';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await params;

  const result = await requireShopPermission(request, 'members', 'full', {
    expectedShopId: shopId,
  });
  if (result instanceof NextResponse) return result;

  const body = await request.json();
  const { memberId, roleId } = body as { memberId: string; roleId: string };

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('shop_members')
    .insert({ shop_id: shopId, member_id: memberId, role_id: roleId })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  return NextResponse.json(data, { headers: AUTH_CACHE_HEADERS });
}
