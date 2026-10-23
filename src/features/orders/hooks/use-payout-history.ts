import { useQuery } from '@tanstack/react-query';
import { getPayoutHistory } from '@/features/orders/services/payout';

export function usePayoutHistory(enabled = true) {
  return useQuery({
    queryKey: ['stripe', 'payouts'],
    queryFn: () => getPayoutHistory(),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
