import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import {
  reserveListingsServer,
  getActiveReservationsServer,
  releaseAllReservationsServer,
} from '@/features/reservations/services/reservation-server';
import { NextResponse } from 'next/server';

// Reserve one or more listings for the buyer during checkout.
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

    const { listingIds } = await req.json();

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return NextResponse.json(
        { error: 'listingIds must be a non-empty array' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const result = await reserveListingsServer(user.id, listingIds);

    return NextResponse.json(result, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error reserving listings:', error);
    return NextResponse.json(
      { error: 'Failed to reserve listings' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Get all active reservations for the current user.
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

    const reservations = await getActiveReservationsServer(user.id);

    return NextResponse.json(reservations, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Release all of the user's active reservations at once.
export async function DELETE() {
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

    await releaseAllReservationsServer(user.id);

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error releasing reservations:', error);
    return NextResponse.json(
      { error: 'Failed to release reservations' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
