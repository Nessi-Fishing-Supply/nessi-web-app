import { createClient } from '@/libs/supabase/server';
import type { ListingStatus, ListingWithPhotos } from '@/features/listings/types/listing';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = new URL(req.url).searchParams.get('status') as ListingStatus | null;

    let query = supabase
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('seller_id', user.id)
      .is('deleted_at', null);

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('updated_at', { ascending: false })
      .order('position', { referencedTable: 'listing_photos', ascending: true });

    const { data: listings, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((listings ?? []) as ListingWithPhotos[]);
  } catch (error) {
    console.error('Error fetching seller listings:', error);
    return NextResponse.json({ error: 'Failed to fetch seller listings' }, { status: 500 });
  }
}
