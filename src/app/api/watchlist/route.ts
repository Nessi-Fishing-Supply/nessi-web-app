import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import {
  addWatcherServer,
  removeWatcherServer,
  getWatchedListingsServer,
} from '@/features/watchlist/services/watchlist-server';
import { NextResponse } from 'next/server';

// List all listings the authenticated user is watching
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

    const listings = await getWatchedListingsServer(user.id);

    return NextResponse.json(listings, { status: 200, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching watched listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watched listings' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Watch a listing for the authenticated user
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

    const body = await req.json();
    const { listing_id } = body;

    if (!listing_id || typeof listing_id !== 'string' || listing_id.trim() === '') {
      return NextResponse.json(
        { error: 'listing_id is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const watcher = await addWatcherServer(user.id, listing_id);

    return NextResponse.json(watcher, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Already watching')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }
    console.error('Error adding watcher:', error);
    return NextResponse.json(
      { error: 'Failed to add watcher' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Stop watching a listing for the authenticated user
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
    const listing_id = searchParams.get('listing_id');

    if (!listing_id || listing_id.trim() === '') {
      return NextResponse.json(
        { error: 'listing_id is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const result = await removeWatcherServer(user.id, listing_id);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Not watching' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json({ success: true }, { status: 200, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error removing watcher:', error);
    return NextResponse.json(
      { error: 'Failed to remove watcher' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
