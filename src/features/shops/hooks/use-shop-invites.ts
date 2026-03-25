import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptShopInvite,
  createShopInvite,
  getShopInvites,
  resendShopInvite,
  revokeShopInvite,
} from '@/features/shops/services/shop-invites';
import { useAuth } from '@/features/auth/context';

export function useShopInvites(shopId: string | undefined) {
  return useQuery({
    queryKey: ['shops', shopId, 'invites'],
    queryFn: () => getShopInvites(shopId!),
    enabled: !!shopId,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shopId, email, roleId }: { shopId: string; email: string; roleId: string }) =>
      createShopInvite(shopId, { email, roleId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'invites'] });
    },
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shopId, inviteId }: { shopId: string; inviteId: string }) =>
      resendShopInvite(shopId, inviteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'invites'] });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shopId, inviteId }: { shopId: string; inviteId: string }) =>
      revokeShopInvite(shopId, inviteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'invites'] });
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (token: string) => acceptShopInvite(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops', 'member', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });
}
