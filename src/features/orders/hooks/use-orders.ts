import { useQuery } from '@tanstack/react-query';
import { getOrders } from '@/features/orders/services/order';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });
}
