import { useQuery } from '@tanstack/react-query';
import { getOrder } from '@/features/orders/services/order';

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => getOrder(orderId!),
    enabled: !!orderId,
  });
}
