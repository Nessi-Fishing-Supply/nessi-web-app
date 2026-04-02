import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { scanText, logModerationFlag } from '@/libs/moderation';
import { NextResponse } from 'next/server';

function parseStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = '/storage/v1/object/public/listing-images/';
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return url.pathname.slice(idx + marker.length);
  } catch {
    return null;
  }
}

// Returns the full details of a single listing, including photos.
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const supabase = await createClient();

    const { data: listing, error } = await supabase
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .order('position', { referencedTable: 'listing_photos' })
      .single();

    if (error || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Don't expose draft/archived/deleted listings to non-owners
    if (listing.status !== 'active' && listing.status !== 'sold') {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || listing.seller_id !== user.id) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error('Error fetching listing:', error);
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
  }
}

// Updates the details of an existing listing owned by the seller.
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

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

    const { data: existing, error: fetchError } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (existing.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    const body = await req.json();

    // Whitelist: only allow fields that sellers can modify
    const ALLOWED_FIELDS = [
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

    const filteredBody = Object.fromEntries(
      Object.entries(body).filter(([key]) => (ALLOWED_FIELDS as readonly string[]).includes(key)),
    );

    if (Object.keys(filteredBody).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Text moderation: scan title and description if present
    const textFields = ['title', 'description'] as const;
    for (const field of textFields) {
      const value = filteredBody[field];
      if (typeof value !== 'string' || value.trim().length === 0) continue;

      const scanResult = scanText(value, 'listing');

      if (scanResult.action === 'block') {
        void logModerationFlag({
          memberId: user.id,
          context: 'listing',
          action: 'block',
          originalContent: scanResult.originalContent,
          sourceId: id,
        });
        return NextResponse.json(
          { error: `The ${field} contains content that violates our community guidelines.` },
          { status: 422, headers: AUTH_CACHE_HEADERS },
        );
      }

      if (scanResult.action === 'redact') {
        filteredBody[field] = scanResult.filteredContent;
        void logModerationFlag({
          memberId: user.id,
          context: 'listing',
          action: 'redact',
          originalContent: scanResult.originalContent,
          filteredContent: scanResult.filteredContent,
          sourceId: id,
        });
      }
      // nudge_off_platform and nudge_negotiation are treated as 'pass' for listings
    }

    const { error: updateError } = await supabase
      .from('listings')
      .update(filteredBody)
      .eq('id', id);

    if (updateError) {
      console.error('Listing update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update listing' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { data: listing, error } = await supabase
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .order('position', { referencedTable: 'listing_photos' })
      .single();

    if (error) {
      console.error('Listing refetch error:', error);
      return NextResponse.json(
        { error: 'Failed to update listing' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json(listing, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error updating listing:', error);
    return NextResponse.json(
      { error: 'Failed to update listing' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Permanently removes a listing and its photos from the seller's account.
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

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

    const { data: existing, error: fetchError } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (existing.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Clean up listing photos from storage (best-effort)
    try {
      const { data: photos } = await supabase
        .from('listing_photos')
        .select('image_url, thumbnail_url')
        .eq('listing_id', id);

      if (photos && photos.length > 0) {
        const paths = photos.flatMap((photo) => {
          const results: string[] = [];
          const imgPath = parseStoragePath(photo.image_url);
          if (imgPath) results.push(imgPath);
          if (photo.thumbnail_url) {
            const thumbPath = parseStoragePath(photo.thumbnail_url);
            if (thumbPath) results.push(thumbPath);
          }
          return results;
        });

        if (paths.length > 0) {
          await supabase.storage.from('listing-images').remove(paths);
        }
      }
    } catch (storageError) {
      console.error('Listing storage cleanup error (non-blocking):', storageError);
    }

    const { error } = await supabase
      .from('listings')
      .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
      .eq('id', id);

    if (error) {
      console.error('Listing delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete listing' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error deleting listing:', error);
    return NextResponse.json(
      { error: 'Failed to delete listing' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
