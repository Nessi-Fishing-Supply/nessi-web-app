import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getShop,
  getShopBySlug,
  getShopsByOwner,
  getShopsByMember,
  getShopMembers,
  checkShopSlugAvailable,
  createShop,
  updateShop,
  deleteShop,
  updateShopSlug,
  addShopMember,
  removeShopMember,
  transferOwnership,
  updateMemberRole,
} from '@/features/shops/services/shop';
import type { ShopUpdate } from '@/features/shops/types/shop';

export function useShop(id: string, enabled = true) {
  return useQuery({
    queryKey: ['shops', id],
    queryFn: () => getShop(id),
    enabled,
  });
}

export function useShopBySlug(slug: string, enabled = true) {
  return useQuery({
    queryKey: ['shops', 'slug', slug],
    queryFn: () => getShopBySlug(slug),
    enabled,
  });
}

export function useShopsByOwner(memberId: string, enabled = true) {
  return useQuery({
    queryKey: ['shops', 'owner', memberId],
    queryFn: () => getShopsByOwner(memberId),
    enabled,
  });
}

export function useShopsByMember(memberId: string, enabled = true) {
  return useQuery({
    queryKey: ['shops', 'member', memberId],
    queryFn: () => getShopsByMember(memberId),
    enabled,
  });
}

export function useShopMembers(shopId: string, enabled = true) {
  return useQuery({
    queryKey: ['shops', shopId, 'members'],
    queryFn: () => getShopMembers(shopId),
    enabled,
  });
}

export function useShopSlugCheck(slug: string) {
  return useQuery({
    queryKey: ['shops', 'slug-check', slug],
    queryFn: () => checkShopSlugAvailable(slug),
    enabled: slug.length >= 2,
    staleTime: 30000,
  });
}

export function useCreateShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      shopName: string;
      slug: string;
      description?: string | null;
      ownerId: string;
    }) => createShop(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });
}

export function useUpdateShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShopUpdate }) => updateShop(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });
}

export function useDeleteShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteShop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });
}

export function useUpdateShopSlug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shopId, slug }: { shopId: string; slug: string }) =>
      updateShopSlug(shopId, slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });
}

export function useAddShopMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shopId,
      memberId,
      roleId,
    }: {
      shopId: string;
      memberId: string;
      roleId: string;
    }) => addShopMember(shopId, memberId, roleId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'members'] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shopId,
      memberId,
      roleId,
    }: {
      shopId: string;
      memberId: string;
      roleId: string;
    }) => updateMemberRole(shopId, memberId, roleId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'members'] });
    },
  });
}

export function useRemoveShopMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shopId, memberId }: { shopId: string; memberId: string }) =>
      removeShopMember(shopId, memberId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shops', variables.shopId, 'members'] });
    },
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shopId, newOwnerId }: { shopId: string; newOwnerId: string }) =>
      transferOwnership(shopId, newOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });
}
