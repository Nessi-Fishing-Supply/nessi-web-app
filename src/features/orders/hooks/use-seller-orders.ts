import { useQuery } from '@tanstack/react-query';
import { getSellerOrders } from '@/features/orders/services/order';

export function useSellerOrders(status?: string) {
  return useQuery({
    queryKey: ['orders', 'seller', status],
    queryFn: () => getSellerOrders(status),
  });
}
