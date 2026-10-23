import { useQuery } from '@tanstack/react-query';
import { getSellerBalance } from '@/features/orders/services/payout';

export function useSellerBalance(enabled = true) {
  return useQuery({
    queryKey: ['stripe', 'balance'],
    queryFn: getSellerBalance,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
