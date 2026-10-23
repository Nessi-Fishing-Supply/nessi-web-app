import { createClient } from '@/libs/supabase/server';
import type { ListingWithPhotos } from '@/features/listings/types/listing';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { scanText, logModerationFlag } from '@/libs/moderation';
import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fields sellers are allowed to set when creating a listing
const ALLOWED_CREATE_FIELDS = [
  'title',
  'description',
  'price_cents',
  'category',
  'condition',
  'brand',
  'model',
  'quantity',
  'weight_oz',
  'shipping_paid_by',
  'shipping_price_cents',
  'cover_photo_url',
  'location_city',
  'location_state',
  'is_visible',
  'length_inches',
  'width_inches',
  'height_inches',
] as const;

// Returns a paginated list of active listings, with optional filters and sorting.
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
      console.error('Listing count error:', countError);
      return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
    }

    let dataQuery = buildQuery(supabase.from('listings').select('*, listing_photos(*)')).range(
      offset,
      offset + limit - 1,
    );

    if (sort === 'price_asc') {
      dataQuery = dataQuery.order('price_cents', { ascending: true });
    } else if (sort === 'price_desc') {
      dataQuery = dataQuery.order('price_cents', { ascending: false });
    } else if (sort === 'watched') {
      dataQuery = dataQuery.order('watcher_count', { ascending: false });
    } else {
      dataQuery = dataQuery.order('created_at', { ascending: false });
    }

    dataQuery = dataQuery.order('position', {
      referencedTable: 'listing_photos',
      ascending: true,
    });

    const { data: listings, error } = await dataQuery;

    if (error) {
      console.error('Listing fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
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

// Creates a new listing draft for the seller, in either member or shop context.
export async function POST(req: Request) {
  try {
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

    const body = await req.json();

    const contextHeader = req.headers.get('X-Nessi-Context') ?? 'member';
    const isShopContext = contextHeader.startsWith('shop:');
    const shopId = isShopContext ? contextHeader.replace('shop:', '') : null;

    // Validate shop context: must be a valid UUID and user must be a member
    if (isShopContext && shopId) {
      if (!UUID_RE.test(shopId)) {
        return NextResponse.json(
          { error: 'Invalid shop ID format' },
          { status: 400, headers: AUTH_CACHE_HEADERS },
        );
      }

      const { data: membership } = await supabase
        .from('shop_members')
        .select('member_id')
        .eq('shop_id', shopId)
        .eq('member_id', user.id)
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: 'Forbidden: not a member of this shop' },
          { status: 403, headers: AUTH_CACHE_HEADERS },
        );
      }
    }

    // Whitelist: only allow fields that sellers can set
    const filteredBody: Record<string, unknown> = {};
    for (const key of ALLOWED_CREATE_FIELDS) {
      if (key in body) {
        filteredBody[key] = body[key];
      }
    }

    // Text moderation: scan title and description
    const textFields = ['title', 'description'] as const;
    for (const field of textFields) {
      const value = filteredBody[field];
      if (typeof value !== 'string' || value.trim().length === 0) continue;

      const scanResult = scanText(value, 'listing');

      if (scanResult.action === 'block') {
        // Fire-and-forget log
        void logModerationFlag({
          memberId: user.id,
          context: 'listing',
          action: 'block',
          originalContent: scanResult.originalContent,
        });
        return NextResponse.json(
          { error: `The ${field} contains content that violates our community guidelines.` },
          { status: 422, headers: AUTH_CACHE_HEADERS },
        );
      }

      if (scanResult.action === 'redact') {
        filteredBody[field] = scanResult.filteredContent;
        // Fire-and-forget log
        void logModerationFlag({
          memberId: user.id,
          context: 'listing',
          action: 'redact',
          originalContent: scanResult.originalContent,
          filteredContent: scanResult.filteredContent,
        });
      }
      // nudge_off_platform and nudge_negotiation are treated as 'pass' for listings
    }

    const { data: listing, error: insertError } = await supabase
      .from('listings')
      .insert({
        ...filteredBody,
        seller_id: user.id,
        member_id: isShopContext ? null : user.id,
        shop_id: shopId,
        status: 'draft' as const,
      } as any)
      .select('id')
      .single();

    if (insertError) {
      console.error('Listing insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create listing' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { data: fullListing, error: fetchError } = await supabase
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('id', listing.id)
      .order('position', { referencedTable: 'listing_photos', ascending: true })
      .single();

    if (fetchError) {
      console.error('Listing refetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to create listing' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json(fullListing as ListingWithPhotos, {
      status: 201,
      headers: AUTH_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
