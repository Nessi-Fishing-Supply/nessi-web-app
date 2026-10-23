import { createClient } from '@/libs/supabase/server';
import type { ListingWithPhotos } from '@/features/listings/types/listing';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Returns all draft listings the seller has not yet published.
export async function GET() {
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

    const { data: drafts, error } = await supabase
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('seller_id', user.id)
      .eq('status', 'draft')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .order('position', { referencedTable: 'listing_photos', ascending: true });

    if (error) {
      console.error('Drafts fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch drafts' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json((drafts ?? []) as ListingWithPhotos[], {
      headers: AUTH_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Creates a new blank draft listing ready for the seller to fill in.
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

    const { data: draft, error } = await supabase
      .from('listings')
      .insert({
        seller_id: user.id,
        member_id: isShopContext ? null : user.id,
        shop_id: shopId,
        status: 'draft',
        title: 'Untitled Draft',
        price_cents: 0,
        category: 'other',
        condition: 'good',
      })
      .select('*, listing_photos(*)')
      .single();

    if (error) {
      console.error('Draft create error:', error);
      return NextResponse.json(
        { error: 'Failed to create draft' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json(draft as ListingWithPhotos, {
      status: 201,
      headers: AUTH_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error creating draft:', error);
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Discards a draft listing that was never published.
export async function DELETE(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing listing id' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('id, seller_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (listing.seller_id !== user.id || listing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { error: deleteError } = await supabase.from('listings').delete().eq('id', id);

    if (deleteError) {
      console.error('Draft delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete draft' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
