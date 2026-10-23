import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import {
  releaseReservationServer,
  extendReservationServer,
} from '@/features/reservations/services/reservation-server';

// Release a specific reservation for the authenticated user
export async function DELETE(req: Request, context: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await context.params;

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

    await releaseReservationServer(user.id, listingId);

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === 'Reservation not found') {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }
    console.error('Error releasing reservation:', error);
    return NextResponse.json(
      { error: 'Failed to release reservation' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Extend the TTL of a reservation by a given number of minutes
export async function PATCH(req: Request, context: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await context.params;

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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { minutes } = body as { minutes?: unknown };

    if (typeof minutes !== 'number' || minutes <= 0 || minutes > 10) {
      return NextResponse.json(
        { error: 'minutes must be a number between 1 and 10' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const updated = await extendReservationServer(user.id, listingId, minutes);

    return NextResponse.json(updated, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Reservation not found') {
        return NextResponse.json(
          { error: 'Reservation not found' },
          { status: 404, headers: AUTH_CACHE_HEADERS },
        );
      }
      if (error.message === 'Reservation already extended') {
        return NextResponse.json(
          { error: 'Reservation already extended' },
          { status: 409, headers: AUTH_CACHE_HEADERS },
        );
      }
      if (error.message === 'Extension must be between 1 and 10 minutes') {
        return NextResponse.json(
          { error: error.message },
          { status: 400, headers: AUTH_CACHE_HEADERS },
        );
      }
    }
    console.error('Error extending reservation:', error);
    return NextResponse.json(
      { error: 'Failed to extend reservation' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
