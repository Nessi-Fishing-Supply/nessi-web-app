import { createClient } from '@/libs/supabase/server';
import type { ListingStatus, ListingWithPhotos } from '@/features/listings/types/listing';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Returns the seller's own listings, optionally filtered by status.
export async function GET(req: Request) {
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

    const status = new URL(req.url).searchParams.get('status') as ListingStatus | null;
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

    let query = supabase
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('seller_id', user.id)
      .is('deleted_at', null);

    if (isShopContext && shopId) {
      query = query.eq('shop_id', shopId);
    } else {
      query = query.is('shop_id', null);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('updated_at', { ascending: false })
      .order('position', { referencedTable: 'listing_photos', ascending: true });

    const { data: listings, error } = await query;

    if (error) {
      console.error('Seller listings fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch seller listings' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json((listings ?? []) as ListingWithPhotos[], {
      headers: AUTH_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error fetching seller listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seller listings' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
