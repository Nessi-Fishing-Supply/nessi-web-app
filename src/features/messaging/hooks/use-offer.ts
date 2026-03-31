import { useQuery } from '@tanstack/react-query';
import { getOffer } from '@/features/messaging/services/offers';
import type { OfferWithDetails } from '@/features/messaging/types/offer';

export function useOffer(offerId: string | undefined) {
  return useQuery<OfferWithDetails>({
    queryKey: ['messages', 'offers', offerId],
    queryFn: () => getOffer(offerId!),
    enabled: !!offerId,
  });
}
