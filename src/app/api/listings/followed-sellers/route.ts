import { createClient } from '@/libs/supabase/server';
import { getFollowedSellerListingsServer } from '@/features/listings/services/listing-server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

// Returns recent active listings from members and shops the user follows
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

    const listings = await getFollowedSellerListingsServer(user.id);

    return NextResponse.json({ listings }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching followed seller listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch followed seller listings' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
