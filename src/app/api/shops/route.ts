import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { SYSTEM_ROLE_IDS } from '@/features/shops/constants/roles';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

  const body = await request.json();
  const { shopName, slug, description, ownerId } = body ?? {};

  if (!shopName || !slug || !ownerId) {
    return NextResponse.json(
      { error: 'shopName, slug, and ownerId are required' },
      { status: 400, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Ensure the authenticated user is the owner being assigned
  if (ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_CACHE_HEADERS });
  }

  const admin = createAdminClient();

  // Step 1: Insert the shop row — reserve_slug will finalize the slug column
  const { data: shop, error: insertError } = await admin
    .from('shops')
    .insert({
      shop_name: shopName,
      slug,
      description: description ?? null,
      owner_id: ownerId,
      avatar_url: null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Shop insert error:', insertError);
    return NextResponse.json(
      { error: 'Failed to create shop' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Step 2: Atomically reserve the slug and link it to the shop
  const { error: slugError } = await admin.rpc('reserve_slug', {
    p_slug: slug,
    p_entity_type: 'shop',
    p_entity_id: shop.id,
  });

  if (slugError) {
    // Rollback: delete the shop row since slug reservation failed
    await admin.from('shops').delete().eq('id', shop.id);

    if (slugError.code === '23505') {
      return NextResponse.json(
        { error: 'Slug is already taken' },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (slugError.message?.includes('Invalid slug format')) {
      return NextResponse.json(
        { error: 'Invalid slug format' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    console.error('Shop slug reservation error:', slugError);
    return NextResponse.json(
      { error: 'Failed to reserve slug' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Step 3: Insert the shop_member row with Owner system role
  const { error: memberError } = await admin.from('shop_members').insert({
    shop_id: shop.id,
    member_id: ownerId,
    role_id: SYSTEM_ROLE_IDS.OWNER,
  });

  if (memberError) {
    // Rollback: release slug and delete shop row
    await admin.from('slugs').delete().eq('entity_type', 'shop').eq('entity_id', shop.id);
    await admin.from('shops').delete().eq('id', shop.id);

    console.error('Shop member insert error:', memberError);
    return NextResponse.json(
      { error: 'Failed to add shop member' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Re-fetch the shop so the slug column reflects the value set by reserve_slug
  const { data: createdShop, error: fetchError } = await admin
    .from('shops')
    .select('*')
    .eq('id', shop.id)
    .single();

  if (fetchError || !createdShop) {
    return NextResponse.json(
      { error: 'Shop created but could not be retrieved' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  return NextResponse.json({ shop: createdShop }, { status: 201, headers: AUTH_CACHE_HEADERS });
}
