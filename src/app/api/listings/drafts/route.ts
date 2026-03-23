import { createClient } from '@/libs/supabase/server';
import type { ListingWithPhotos } from '@/features/listings/types/listing';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: AUTH_CACHE_HEADERS });
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
      return NextResponse.json({ error: error.message }, { status: 500, headers: AUTH_CACHE_HEADERS });
    }

    return NextResponse.json((drafts ?? []) as ListingWithPhotos[], { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500, headers: AUTH_CACHE_HEADERS });
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

    const contextHeader = req.headers.get('X-Nessi-Context') ?? 'member';
    const isShopContext = contextHeader.startsWith('shop:');
    const shopId = isShopContext ? contextHeader.replace('shop:', '') : null;

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
      return NextResponse.json({ error: error.message }, { status: 500, headers: AUTH_CACHE_HEADERS });
    }

    return NextResponse.json(draft as ListingWithPhotos, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error creating draft:', error);
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500, headers: AUTH_CACHE_HEADERS });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: AUTH_CACHE_HEADERS });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing listing id' }, { status: 400, headers: AUTH_CACHE_HEADERS });
    }

    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('id, seller_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404, headers: AUTH_CACHE_HEADERS });
    }

    if (listing.seller_id !== user.id || listing.status !== 'draft') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_CACHE_HEADERS });
    }

    const { error: deleteError } = await supabase.from('listings').delete().eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500, headers: AUTH_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500, headers: AUTH_CACHE_HEADERS });
  }
}
