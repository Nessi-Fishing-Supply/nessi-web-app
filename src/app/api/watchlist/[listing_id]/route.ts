import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { getWatchStatusServer } from '@/features/watchlist/services/watchlist-server';
import { NextResponse } from 'next/server';

// Check if the authenticated user is watching a specific listing
export async function GET(_req: Request, { params }: { params: Promise<{ listing_id: string }> }) {
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

    const { listing_id } = await params;

    const status = await getWatchStatusServer(user.id, listing_id);

    return NextResponse.json(status, { status: 200, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching watch status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watch status' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
