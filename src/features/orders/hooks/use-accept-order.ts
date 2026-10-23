import { useMutation, useQueryClient } from '@tanstack/react-query';
import { acceptOrder } from '@/features/orders/services/order';

type UseAcceptOrderOptions = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function useAcceptOrder({ onSuccess, onError }: UseAcceptOrderOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => acceptOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error instanceof Error ? error : new Error('Failed to accept order'));
    },
  });
}
