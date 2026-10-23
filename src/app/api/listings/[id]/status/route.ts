import { createClient } from '@/libs/supabase/server';
import type { ListingStatus } from '@/features/listings/types/listing';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

// Note: Active listings can be deleted via DELETE /api/listings/[id] (soft delete),
// not through status transitions. This map only covers status-to-status changes.
// Note: 'reserved' exists in the DB enum but is intentionally excluded here — it has
// no valid transitions and is unreachable via the API.
const VALID_TRANSITIONS: Partial<Record<ListingStatus, ListingStatus[]>> = {
  draft: ['active', 'deleted'],
  active: ['archived', 'sold'],
  archived: ['active'],
  sold: [],
  deleted: [],
};

// Changes a listing's status — such as publishing, archiving, or marking it sold.
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
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

    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (listing.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { status, sold_price_cents } = await req.json();

    const currentStatus = listing.status as ListingStatus;
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(status as ListingStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${currentStatus}' to '${status}'. Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'none'}.`,
        },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const updatePayload: Record<string, string | number | null> = { status };

    if (status === 'active' && !listing.published_at) {
      updatePayload.published_at = new Date().toISOString();
    }

    if (status === 'sold') {
      updatePayload.sold_at = new Date().toISOString();
      if (typeof sold_price_cents === 'number' && sold_price_cents > 0) {
        updatePayload.price_cents = sold_price_cents;
      }
    }

    if (status === 'deleted') {
      updatePayload.deleted_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from('listings')
      .update(updatePayload)
      .eq('id', id)
      .select('*, listing_photos(*)')
      .order('position', { referencedTable: 'listing_photos', ascending: true })
      .single();

    if (updateError) {
      console.error('Listing status update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update listing status' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json(updated, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error updating listing status:', error);
    return NextResponse.json(
      { error: 'Failed to update listing status' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
