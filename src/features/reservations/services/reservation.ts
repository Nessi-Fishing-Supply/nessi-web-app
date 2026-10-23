import { get, post, del, patch } from '@/libs/fetch';
import type {
  Reservation,
  ReservationWithListing,
  ReservationResult,
  ReservationCheck,
} from '@/features/reservations/types/reservation';

const BASE_URL = '/api/reservations';

export const reserveListings = async (listingIds: string[]): Promise<ReservationResult> =>
  post<ReservationResult>(BASE_URL, { listingIds });

export const getActiveReservations = async (): Promise<ReservationWithListing[]> =>
  get<ReservationWithListing[]>(BASE_URL);

export const releaseAllReservations = async (): Promise<{ success: boolean }> =>
  del<{ success: boolean }>(BASE_URL);

export const releaseReservation = async (listingId: string): Promise<{ success: boolean }> =>
  del<{ success: boolean }>(`${BASE_URL}/${listingId}`);

export const extendReservation = async (listingId: string, minutes: number): Promise<Reservation> =>
  patch<Reservation>(`${BASE_URL}/${listingId}`, { minutes });

export const checkReservation = async (listingId: string): Promise<ReservationCheck> =>
  get<ReservationCheck>(`${BASE_URL}/check/${listingId}`);
