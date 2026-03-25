'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '@/features/addresses/services/address';
import type { Address, AddressFormData } from '@/features/addresses/types/address';

export function useAddresses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: getAddresses,
    enabled: !!user?.id,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (data: AddressFormData) => createAddress(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ addressId, data }: { addressId: string; data: Partial<AddressFormData> }) =>
      updateAddress(addressId, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (addressId: string) => deleteAddress(addressId),
    onMutate: async (addressId) => {
      await queryClient.cancelQueries({ queryKey: ['addresses', user?.id] });
      const previousAddresses = queryClient.getQueryData<Address[]>(['addresses', user?.id]);
      queryClient.setQueryData<Address[]>(['addresses', user?.id], (old) =>
        old?.filter((address) => address.id !== addressId),
      );
      return { previousAddresses };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(['addresses', user?.id], context.previousAddresses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] });
    },
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (addressId: string) => setDefaultAddress(addressId),
    onMutate: async (addressId) => {
      await queryClient.cancelQueries({ queryKey: ['addresses', user?.id] });
      const previousAddresses = queryClient.getQueryData<Address[]>(['addresses', user?.id]);
      queryClient.setQueryData<Address[]>(['addresses', user?.id], (old) =>
        old?.map((address) => ({
          ...address,
          is_default: address.id === addressId,
        })),
      );
      return { previousAddresses };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(['addresses', user?.id], context.previousAddresses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] });
    },
  });
}
