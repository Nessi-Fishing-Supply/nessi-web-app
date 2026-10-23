import { useMutation, useQueryClient } from '@tanstack/react-query';
import { shipOrder } from '@/features/orders/services/order';

type UseShipOrderOptions = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function useShipOrder({ onSuccess, onError }: UseShipOrderOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      trackingNumber,
      carrier,
    }: {
      orderId: string;
      trackingNumber: string;
      carrier: string;
    }) => shipOrder(orderId, { trackingNumber, carrier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error instanceof Error ? error : new Error('Failed to ship order'));
    },
  });
}
