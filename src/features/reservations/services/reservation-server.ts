import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import type {
  Reservation,
  ReservationResult,
  ReservationWithListing,
  ReservationCheck,
} from '@/features/reservations/types/reservation';

// ---------- Cleanup ----------

export async function cleanupExpiredReservationsServer(): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc('release_expired_reservations');
  if (error) {
    console.error('[cleanupExpiredReservationsServer] cleanup failed:', error.message);
  }
}

// ---------- Reserve ----------

export async function reserveListingsServer(
  userId: string,
  listingIds: string[],
): Promise<ReservationResult> {
  const admin = createAdminClient();
  const result: ReservationResult = { reserved: [], failed: [] };

  for (const listingId of listingIds) {
    const { data: listing, error: listingError } = await admin
      .from('listings')
      .select('id, status')
      .eq('id', listingId)
      .is('deleted_at', null)
      .single();

    if (listingError || !listing) {
      result.failed.push({ listingId, reason: 'not_active' });
      continue;
    }

    if (listing.status !== 'active') {
      const reason = listing.status === 'sold' ? 'sold' : 'not_active';
      result.failed.push({ listingId, reason });
      continue;
    }

    const reservedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await admin.from('reservations').insert({
      listing_id: listingId,
      reserved_by: userId,
      reserved_until: reservedUntil,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        result.failed.push({ listingId, reason: 'already_reserved' });
      } else {
        result.failed.push({ listingId, reason: 'not_active' });
      }
      continue;
    }

    await admin.from('listings').update({ status: 'reserved' }).eq('id', listingId);

    result.reserved.push({ listingId, reservedUntil });
  }

  return result;
}

// ---------- Release ----------

export async function releaseReservationServer(userId: string, listingId: string): Promise<void> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('reservations')
    .delete()
    .eq('reserved_by', userId)
    .eq('listing_id', listingId)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Reservation not found');
  }

  await admin
    .from('listings')
    .update({ status: 'active' })
    .eq('id', listingId)
    .eq('status', 'reserved');
}

export async function releaseAllReservationsServer(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: reservations } = await admin
    .from('reservations')
    .select('listing_id')
    .eq('reserved_by', userId);

  if (!reservations || reservations.length === 0) {
    return;
  }

  const listingIds = reservations.map((r) => r.listing_id);

  await admin.from('reservations').delete().eq('reserved_by', userId);

  await admin
    .from('listings')
    .update({ status: 'active' })
    .in('id', listingIds)
    .eq('status', 'reserved');
}

// ---------- Read ----------

export async function getActiveReservationsServer(
  userId: string,
): Promise<ReservationWithListing[]> {
  await cleanupExpiredReservationsServer();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reservations')
    .select('*, listing:listings(title, price_cents, cover_photo_url, condition)')
    .eq('reserved_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch reservations: ${error.message}`);
  }

  return (data ?? []) as ReservationWithListing[];
}

// ---------- Extend ----------

export async function extendReservationServer(
  userId: string,
  listingId: string,
  minutes: number,
): Promise<Reservation> {
  if (minutes <= 0 || minutes > 10) {
    throw new Error('Extension must be between 1 and 10 minutes');
  }

  const admin = createAdminClient();

  const { data: reservation, error } = await admin
    .from('reservations')
    .select('*')
    .eq('reserved_by', userId)
    .eq('listing_id', listingId)
    .single();

  if (error || !reservation) {
    throw new Error('Reservation not found');
  }

  const initialExpiry = new Date(
    new Date(reservation.created_at).getTime() + 10 * 60 * 1000,
  );

  if (new Date(reservation.reserved_until) > initialExpiry) {
    throw new Error('Reservation already extended');
  }

  const newReservedUntil = new Date(
    new Date(reservation.reserved_until).getTime() + minutes * 60 * 1000,
  ).toISOString();

  const { data: updated, error: updateError } = await admin
    .from('reservations')
    .update({ reserved_until: newReservedUntil })
    .eq('reserved_by', userId)
    .eq('listing_id', listingId)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to extend reservation: ${updateError?.message}`);
  }

  return updated as Reservation;
}

// ---------- Status check ----------

export async function isListingReservedServer(listingId: string): Promise<ReservationCheck> {
  await cleanupExpiredReservationsServer();

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('reservations')
    .select('id')
    .eq('listing_id', listingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check reservation status: ${error.message}`);
  }

  return { reserved: data !== null };
}
