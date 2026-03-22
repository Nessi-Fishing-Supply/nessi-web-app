import { createClient } from '@/libs/supabase/server';
import type { ListingStatus } from '@/features/listings/types/listing';
import { NextResponse } from 'next/server';

const VALID_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  draft: ['active', 'deleted'],
  active: ['archived', 'sold'],
  archived: ['active'],
  sold: [],
  reserved: [],
  deleted: [],
};

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { status } = await req.json();

    const currentStatus = listing.status as ListingStatus;
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(status as ListingStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${currentStatus}' to '${status}'. Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'none'}.`,
        },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, string | null> = { status };

    if (status === 'active' && !listing.published_at) {
      updatePayload.published_at = new Date().toISOString();
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
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating listing status:', error);
    return NextResponse.json({ error: 'Failed to update listing status' }, { status: 500 });
  }
}
