import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: AUTH_CACHE_HEADERS });
  }

  const body = await request.json();
  const { shopId, slug } = body ?? {};

  if (!shopId || !slug) {
    return NextResponse.json({ error: 'shopId and slug are required' }, { status: 400, headers: AUTH_CACHE_HEADERS });
  }

  const admin = createAdminClient();

  const { data: shop } = await admin
    .from('shops')
    .select('id, owner_id')
    .eq('id', shopId)
    .is('deleted_at', null)
    .single();

  if (!shop) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404, headers: AUTH_CACHE_HEADERS });
  }

  if (shop.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_CACHE_HEADERS });
  }

  const { error: rpcError } = await admin.rpc('reserve_slug', {
    p_slug: slug,
    p_entity_type: 'shop',
    p_entity_id: shopId,
  });

  if (rpcError) {
    if (rpcError.code === '23505') {
      return NextResponse.json({ error: 'Slug is already taken' }, { status: 409, headers: AUTH_CACHE_HEADERS });
    }

    if (rpcError.message?.includes('Invalid slug format')) {
      return NextResponse.json({ error: 'Invalid slug format' }, { status: 400, headers: AUTH_CACHE_HEADERS });
    }

    return NextResponse.json({ error: rpcError.message }, { status: 500, headers: AUTH_CACHE_HEADERS });
  }

  return NextResponse.json({ success: true, slug }, { headers: AUTH_CACHE_HEADERS });
}
