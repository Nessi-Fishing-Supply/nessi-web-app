import { createClient } from '@/libs/supabase/server';
import type { ListingWithPhotos } from '@/features/listings/types/listing';
import { NextResponse } from 'next/server';

// Full-text search for listings with filters for category, condition, price, and location.
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const q = searchParams.get('q');
    const category = searchParams.get('category');
    const condition = searchParams.get('condition');
    const priceMin = searchParams.get('price_min');
    const priceMax = searchParams.get('price_max');
    const locationState = searchParams.get('location_state');
    const freeShipping = searchParams.get('free_shipping');
    const sort = searchParams.get('sort') ?? (q ? 'relevance' : 'newest');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') ?? '24', 10)));

    // species and listing_type are accepted but no-op (columns don't exist yet)
    // searchParams.get('species')
    // searchParams.get('listing_type')

    if (q !== null && q.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 },
      );
    }

    const offset = (page - 1) * limit;

    const applyFilters = (base: ReturnType<typeof supabase.from>) => {
      let query = base.is('deleted_at', null).eq('status', 'active');

      if (category) {
        const categories = category.split(',').map((c) => c.trim());
        query = query.in('category', categories);
      }

      if (condition) {
        const conditions = condition.split(',').map((c) => c.trim());
        query = query.in('condition', conditions);
      }

      if (priceMin) {
        query = query.gte('price_cents', parseInt(priceMin, 10));
      }

      if (priceMax) {
        query = query.lte('price_cents', parseInt(priceMax, 10));
      }

      if (locationState) {
        query = query.eq('location_state', locationState);
      }

      if (freeShipping === 'true') {
        query = query.eq('shipping_paid_by', 'seller');
      }

      return query;
    };

    const applySorting = (base: ReturnType<typeof supabase.from>, usedFts: boolean) => {
      if (sort === 'price_asc') {
        return base.order('price_cents', { ascending: true });
      } else if (sort === 'price_desc') {
        return base.order('price_cents', { ascending: false });
      } else if (sort === 'watched') {
        return base.order('watcher_count', { ascending: false });
      } else if (sort === 'newest') {
        return base.order('published_at', { ascending: false });
      } else if (sort === 'relevance' && usedFts) {
        // FTS returns results ordered by rank by default; fall back to published_at
        return base.order('published_at', { ascending: false });
      } else {
        return base.order('published_at', { ascending: false });
      }
    };

    // --- Primary FTS attempt ---
    let usedFts = false;
    let listings: ListingWithPhotos[] | null = null;
    let total = 0;

    if (q) {
      usedFts = true;

      // Count
      const countQuery = applyFilters(
        supabase.from('listings').select('*', { count: 'exact', head: true }),
      ).textSearch('search_vector', q, { type: 'websearch' });

      const { count: ftsCount, error: countError } = await countQuery;

      if (countError) {
        console.error('Search count error:', countError);
        return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
      }

      if ((ftsCount ?? 0) > 0) {
        // FTS has results — fetch them
        let dataQuery = applyFilters(supabase.from('listings').select('*, listing_photos(*)'))
          .textSearch('search_vector', q, { type: 'websearch' })
          .range(offset, offset + limit - 1);

        dataQuery = applySorting(dataQuery, true);
        dataQuery = dataQuery.order('position', {
          referencedTable: 'listing_photos',
          ascending: true,
        });

        const { data, error } = await dataQuery;

        if (error) {
          console.error('Search fetch error:', error);
          return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
        }

        listings = (data ?? []) as ListingWithPhotos[];
        total = ftsCount ?? 0;
      } else {
        // FTS returned 0 — fall back to ilike trigram-style search
        usedFts = false;

        const fallbackCountQuery = applyFilters(
          supabase.from('listings').select('*', { count: 'exact', head: true }),
        ).or(`title.ilike.%${q}%,brand.ilike.%${q}%`);

        const { count: fallbackCount, error: fallbackCountError } = await fallbackCountQuery;

        if (fallbackCountError) {
          console.error('Fallback count error:', fallbackCountError);
          return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
        }

        let fallbackDataQuery = applyFilters(
          supabase.from('listings').select('*, listing_photos(*)'),
        )
          .or(`title.ilike.%${q}%,brand.ilike.%${q}%`)
          .range(offset, offset + limit - 1);

        fallbackDataQuery = applySorting(fallbackDataQuery, false);
        fallbackDataQuery = fallbackDataQuery.order('position', {
          referencedTable: 'listing_photos',
          ascending: true,
        });

        const { data: fallbackData, error: fallbackError } = await fallbackDataQuery;

        if (fallbackError) {
          console.error('Fallback fetch error:', fallbackError);
          return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
        }

        listings = (fallbackData ?? []) as ListingWithPhotos[];
        total = fallbackCount ?? 0;
      }
    } else {
      // No search query — plain filtered browse
      const countQuery = applyFilters(
        supabase.from('listings').select('*', { count: 'exact', head: true }),
      );

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error('Search count error:', countError);
        return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
      }

      let dataQuery = applyFilters(supabase.from('listings').select('*, listing_photos(*)')).range(
        offset,
        offset + limit - 1,
      );

      dataQuery = applySorting(dataQuery, usedFts);
      dataQuery = dataQuery.order('position', {
        referencedTable: 'listing_photos',
        ascending: true,
      });

      const { data, error } = await dataQuery;

      if (error) {
        console.error('Search fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
      }

      listings = (data ?? []) as ListingWithPhotos[];
      total = count ?? 0;
    }

    return NextResponse.json({
      listings,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error searching listings:', error);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}
