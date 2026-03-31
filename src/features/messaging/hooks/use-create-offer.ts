import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOffer } from '@/features/messaging/services/offers';
import type { Offer, CreateOfferParams } from '@/features/messaging/types/offer';

type UseCreateOfferOptions = {
  onSuccess?: (offer: Offer) => void;
  onError?: (error: Error) => void;
};

export function useCreateOffer({ onSuccess, onError }: UseCreateOfferOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateOfferParams) => createOffer(params),
    onError: (error) => {
      onError?.(error instanceof Error ? error : new Error('Failed to create offer'));
    },
    onSuccess: (offer) => {
      onSuccess?.(offer);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'offers'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
    },
  });
}
