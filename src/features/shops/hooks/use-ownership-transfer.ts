import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  initiateOwnershipTransfer,
  getOwnershipTransfer,
  cancelOwnershipTransfer,
  getOwnershipTransferByToken,
  acceptOwnershipTransfer,
} from '@/features/shops/services/shop-ownership-transfer';

export function useOwnershipTransfer(shopId: string | undefined) {
  return useQuery({
    queryKey: ['shops', shopId, 'ownership-transfer'],
    queryFn: () => getOwnershipTransfer(shopId!),
    enabled: !!shopId,
  });
}

export function useOwnershipTransferByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['shops', 'ownership-transfer', token],
    queryFn: () => getOwnershipTransferByToken(token!),
    enabled: !!token,
  });
}

export function useInitiateOwnershipTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shopId, newOwnerId }: { shopId: string; newOwnerId: string }) =>
      initiateOwnershipTransfer(shopId, newOwnerId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['shops', variables.shopId, 'ownership-transfer'],
      });
    },
  });
}

export function useCancelOwnershipTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shopId }: { shopId: string }) => cancelOwnershipTransfer(shopId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['shops', variables.shopId, 'ownership-transfer'],
      });
    },
  });
}

export function useAcceptOwnershipTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => acceptOwnershipTransfer(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });
}
