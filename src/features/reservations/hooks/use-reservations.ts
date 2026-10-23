'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context';
import {
  reserveListings,
  getActiveReservations,
  releaseAllReservations,
  releaseReservation,
  extendReservation,
  checkReservation,
} from '@/features/reservations/services/reservation';
import type { ReservationWithListing } from '@/features/reservations/types/reservation';

export function useActiveReservations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reservations', user?.id],
    queryFn: getActiveReservations,
    enabled: !!user?.id,
    staleTime: 10 * 1000,
  });
}

export function useReserveListings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (listingIds: string[]) => reserveListings(listingIds),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
    },
  });
}

export function useReleaseReservation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (listingId: string) => releaseReservation(listingId),
    onMutate: async (listingId) => {
      await queryClient.cancelQueries({ queryKey: ['reservations', user?.id] });

      const previousReservations = queryClient.getQueryData<ReservationWithListing[]>([
        'reservations',
        user?.id,
      ]);

      queryClient.setQueryData<ReservationWithListing[]>(['reservations', user?.id], (old) =>
        old?.filter((item) => item.listing_id !== listingId),
      );

      return { previousReservations };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousReservations) {
        queryClient.setQueryData(['reservations', user?.id], context.previousReservations);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
    },
  });
}

export function useReleaseAllReservations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: releaseAllReservations,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['reservations', user?.id] });

      const previousReservations = queryClient.getQueryData<ReservationWithListing[]>([
        'reservations',
        user?.id,
      ]);

      queryClient.setQueryData<ReservationWithListing[]>(['reservations', user?.id], []);

      return { previousReservations };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousReservations) {
        queryClient.setQueryData(['reservations', user?.id], context.previousReservations);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
    },
  });
}

export function useExtendReservation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ listingId, minutes }: { listingId: string; minutes: number }) =>
      extendReservation(listingId, minutes),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations', user?.id] });
    },
  });
}

export function useCheckReservation(listingId: string) {
  return useQuery({
    queryKey: ['reservation-check', listingId],
    queryFn: () => checkReservation(listingId),
    enabled: !!listingId,
    staleTime: 15 * 1000,
  });
}
