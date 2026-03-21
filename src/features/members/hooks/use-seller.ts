import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSellerPreconditions, toggleSeller } from '@/features/members/services/seller';

export function useSellerPreconditions(enabled = true) {
  return useQuery({
    queryKey: ['members', 'seller-preconditions'],
    queryFn: getSellerPreconditions,
    enabled,
  });
}

export function useToggleSeller() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isSeller: boolean) => toggleSeller(isSeller),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['members', 'seller-preconditions'] });
    },
  });
}
