import { createClient } from '@/libs/supabase/server';
import type { ListingWithPhotos } from '@/features/listings/types/listing';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const category = searchParams.get('category');
    const condition = searchParams.get('condition');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sort = searchParams.get('sort') ?? 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') ?? '24', 10)));

    const offset = (page - 1) * limit;

    const buildQuery = (base: ReturnType<typeof supabase.from>) => {
      let q = base.is('deleted_at', null).eq('status', 'active');

      if (category) {
        q = q.eq('category', category);
      }

      if (condition) {
        const conditions = condition.split(',').map((c) => c.trim());
        q = q.in('condition', conditions);
      }

      if (search) {
        q = q.textSearch('search_vector', search, { type: 'websearch' });
      }

      if (minPrice) {
        q = q.gte('price_cents', parseInt(minPrice, 10));
      }

      if (maxPrice) {
        q = q.lte('price_cents', parseInt(maxPrice, 10));
      }

      return q;
    };

    const countQuery = buildQuery(
      supabase.from('listings').select('*', { count: 'exact', head: true }),
    );
    const { count, error: countError } = await countQuery;

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    let dataQuery = buildQuery(supabase.from('listings').select('*, listing_photos(*)')).range(
      offset,
      offset + limit - 1,
    );

    if (sort === 'price_asc') {
      dataQuery = dataQuery.order('price_cents', { ascending: true });
    } else if (sort === 'price_desc') {
      dataQuery = dataQuery.order('price_cents', { ascending: false });
    } else {
      dataQuery = dataQuery.order('created_at', { ascending: false });
    }

    dataQuery = dataQuery.order('position', {
      referencedTable: 'listing_photos',
      ascending: true,
    });

    const { data: listings, error } = await dataQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      listings: (listings ?? []) as ListingWithPhotos[],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: AUTH_CACHE_HEADERS });
    }

    const body = await req.json();

    const contextHeader = req.headers.get('X-Nessi-Context') ?? 'member';
    const isShopContext = contextHeader.startsWith('shop:');
    const shopId = isShopContext ? contextHeader.replace('shop:', '') : null;

    const { data: listing, error: insertError } = await supabase
      .from('listings')
      .insert({
        ...body,
        seller_id: user.id,
        member_id: isShopContext ? null : user.id,
        shop_id: shopId,
        status: body.status ?? 'draft',
      })
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500, headers: AUTH_CACHE_HEADERS });
    }

    const { data: fullListing, error: fetchError } = await supabase
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('id', listing.id)
      .order('position', { referencedTable: 'listing_photos', ascending: true })
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500, headers: AUTH_CACHE_HEADERS });
    }

    return NextResponse.json(fullListing as ListingWithPhotos, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500, headers: AUTH_CACHE_HEADERS });
  }
}
