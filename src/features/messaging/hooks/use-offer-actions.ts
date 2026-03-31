import { useMutation, useQueryClient } from '@tanstack/react-query';
import { acceptOffer, declineOffer, counterOffer } from '@/features/messaging/services/offers';
import type { Offer, OfferWithDetails, CounterOfferParams } from '@/features/messaging/types/offer';

type UseOfferActionsOptions = {
  offerId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function useOfferActions({ offerId, onSuccess, onError }: UseOfferActionsOptions) {
  const queryClient = useQueryClient();
  const offerKey = ['messages', 'offers', offerId];
  const threadsKey = ['messages', 'threads'];

  const accept = useMutation({
    mutationFn: () => acceptOffer(offerId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: offerKey });
      const previous = queryClient.getQueryData<OfferWithDetails>(offerKey);
      queryClient.setQueryData<OfferWithDetails>(offerKey, (old) =>
        old ? { ...old, status: 'accepted' as const } : old,
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(offerKey, context.previous);
      }
      onError?.(error instanceof Error ? error : new Error('Failed to accept offer'));
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: offerKey });
      queryClient.invalidateQueries({ queryKey: threadsKey });
    },
  });

  const decline = useMutation({
    mutationFn: () => declineOffer(offerId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: offerKey });
      const previous = queryClient.getQueryData<OfferWithDetails>(offerKey);
      queryClient.setQueryData<OfferWithDetails>(offerKey, (old) =>
        old ? { ...old, status: 'declined' as const } : old,
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(offerKey, context.previous);
      }
      onError?.(error instanceof Error ? error : new Error('Failed to decline offer'));
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: offerKey });
      queryClient.invalidateQueries({ queryKey: threadsKey });
    },
  });

  const counter = useMutation({
    mutationFn: (params: CounterOfferParams) => counterOffer(offerId, params),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: offerKey });
      const previous = queryClient.getQueryData<OfferWithDetails>(offerKey);
      queryClient.setQueryData<OfferWithDetails>(offerKey, (old) =>
        old ? { ...old, status: 'countered' as const } : old,
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(offerKey, context.previous);
      }
      onError?.(error instanceof Error ? error : new Error('Failed to counter offer'));
    },
    onSuccess: (newOffer: Offer) => {
      queryClient.setQueryData(['messages', 'offers', newOffer.id], newOffer);
      onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: offerKey });
      queryClient.invalidateQueries({ queryKey: threadsKey });
    },
  });

  return { accept, decline, counter };
}
