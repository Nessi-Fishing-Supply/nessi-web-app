import type { Database } from '@/types/database';
import type { Listing } from '@/features/listings/types/listing';

export type Reservation = Database['public']['Tables']['reservations']['Row'];

export type ReservationInsert = Omit<
  Database['public']['Tables']['reservations']['Insert'],
  'id' | 'created_at'
>;

export type ReservationWithListing = Reservation & {
  listing: Pick<Listing, 'title' | 'price_cents' | 'cover_photo_url' | 'condition'>;
};

export type ReservationResult = {
  reserved: { listingId: string; reservedUntil: string }[];
  failed: { listingId: string; reason: 'already_reserved' | 'sold' | 'not_active' }[];
};

export type ReservationCheck = {
  reserved: boolean;
};
