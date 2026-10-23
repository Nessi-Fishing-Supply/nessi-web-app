import { createClient } from '@/libs/supabase/server';
import type { ListingWithPhotos } from '@/features/listings/types/listing';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Creates a new draft listing copied from an existing one the seller owns.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: 'Invalid listing ID format' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const contextHeader = req.headers.get('X-Nessi-Context') ?? 'member';
    const isShopContext = contextHeader.startsWith('shop:');
    const shopId = isShopContext ? contextHeader.replace('shop:', '') : null;

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

    const { data: source, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('seller_id', user.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !source) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (source.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { data: draft, error: insertError } = await supabase
      .from('listings')
      .insert({
        seller_id: user.id,
        member_id: isShopContext ? null : user.id,
        shop_id: shopId,
        status: 'draft',
        title: `Copy of ${source.title}`,
        description: source.description,
        category: source.category,
        condition: source.condition,
        price_cents: source.price_cents,
        shipping_paid_by: source.shipping_paid_by,
        shipping_price_cents: source.shipping_price_cents,
        weight_oz: source.weight_oz,
        brand: source.brand,
        model: source.model,
        quantity: source.quantity,
        location_city: source.location_city,
        location_state: source.location_state,
      })
      .select('*, listing_photos(*)')
      .single();

    if (insertError) {
      console.error('Duplicate listing error:', insertError);
      return NextResponse.json(
        { error: 'Failed to duplicate listing' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json(draft as ListingWithPhotos, {
      status: 201,
      headers: AUTH_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error duplicating listing:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate listing' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
