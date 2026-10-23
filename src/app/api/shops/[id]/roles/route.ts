import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { requireShopPermission } from '@/libs/shop-permissions';

// Returns the list of roles available to assign to members of a shop.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await params;

  const result = await requireShopPermission(request, 'members', 'view', {
    expectedShopId: shopId,
  });
  if (result instanceof NextResponse) return result;

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('shop_roles')
    .select('*')
    .or(`shop_id.eq.${shopId},is_system.eq.true`)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  return NextResponse.json(data, { headers: AUTH_CACHE_HEADERS });
}
