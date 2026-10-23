import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { requireShopPermission } from '@/libs/shop-permissions';

// Reserves a new URL slug for a shop, replacing the previous one.
export async function POST(request: Request) {
  const result = await requireShopPermission(request, 'shop_settings', 'full');
  if (result instanceof NextResponse) return result;

  const body = await request.json();
  const { shopId, slug } = body ?? {};

  if (!shopId || !slug) {
    return NextResponse.json(
      { error: 'shopId and slug are required' },
      { status: 400, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (shopId !== result.shopId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_CACHE_HEADERS });
  }

  const admin = createAdminClient();

  const { error: rpcError } = await admin.rpc('reserve_slug', {
    p_slug: slug,
    p_entity_type: 'shop',
    p_entity_id: shopId,
  });

  if (rpcError) {
    if (rpcError.code === '23505') {
      return NextResponse.json(
        { error: 'Slug is already taken' },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (rpcError.message?.includes('Invalid slug format')) {
      return NextResponse.json(
        { error: 'Invalid slug format' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    console.error('Slug update error:', rpcError);
    return NextResponse.json(
      { error: 'Failed to update slug' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  return NextResponse.json({ success: true, slug }, { headers: AUTH_CACHE_HEADERS });
}
