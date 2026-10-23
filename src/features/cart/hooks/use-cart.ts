'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context';
import { useGuestCart } from '@/features/cart/hooks/use-guest-cart';
import { clearGuestCart } from '@/features/cart/utils/guest-cart';
import {
  getCart,
  getCartCount,
  addToCart,
  removeFromCart,
  clearCart,
  validateCart,
  mergeGuestCart,
  refreshExpiry,
} from '@/features/cart/services/cart';
import type { CartItemWithListing } from '@/features/cart/types/cart';

export function useCart() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cart', user?.id],
    queryFn: getCart,
    enabled: !!user?.id,
  });
}

export function useCartCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cart-count', user?.id],
    queryFn: getCartCount,
    enabled: !!user?.id,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ listingId, addedFrom }: { listingId: string; addedFrom?: string }) =>
      addToCart(listingId, addedFrom),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['cart', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['cart-count', user?.id] });

      const previousCount = queryClient.getQueryData<{ count: number }>(['cart-count', user?.id]);

      queryClient.setQueryData<{ count: number }>(['cart-count', user?.id], (old) => ({
        count: (old?.count ?? 0) + 1,
      }));

      return { previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCount) {
        queryClient.setQueryData(['cart-count', user?.id], context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cart-count', user?.id] });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (cartItemId: string) => removeFromCart(cartItemId),
    onMutate: async (cartItemId) => {
      await queryClient.cancelQueries({ queryKey: ['cart', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['cart-count', user?.id] });

      const previousCart = queryClient.getQueryData<CartItemWithListing[]>(['cart', user?.id]);
      const previousCount = queryClient.getQueryData<{ count: number }>(['cart-count', user?.id]);

      queryClient.setQueryData<CartItemWithListing[]>(['cart', user?.id], (old) =>
        old?.filter((item) => item.id !== cartItemId),
      );

      queryClient.setQueryData<{ count: number }>(['cart-count', user?.id], (old) => ({
        count: Math.max((old?.count ?? 1) - 1, 0),
      }));

      return { previousCart, previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart', user?.id], context.previousCart);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['cart-count', user?.id], context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cart-count', user?.id] });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: clearCart,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['cart', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['cart-count', user?.id] });

      const previousCart = queryClient.getQueryData<CartItemWithListing[]>(['cart', user?.id]);
      const previousCount = queryClient.getQueryData<{ count: number }>(['cart-count', user?.id]);

      queryClient.setQueryData<CartItemWithListing[]>(['cart', user?.id], []);
      queryClient.setQueryData<{ count: number }>(['cart-count', user?.id], { count: 0 });

      return { previousCart, previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart', user?.id], context.previousCart);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['cart-count', user?.id], context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cart-count', user?.id] });
    },
  });
}

export function useValidateCart() {
  return useMutation({
    mutationFn: validateCart,
  });
}

export function useMergeGuestCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: mergeGuestCart,
    onSuccess: () => {
      clearGuestCart();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cart-count', user?.id] });
    },
  });
}

export function useRefreshExpiry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (cartItemId: string) => refreshExpiry(cartItemId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
    },
  });
}

export function useCartBadgeCount(): number {
  const { user, isLoading: authLoading } = useAuth();
  const cartCount = useCartCount();
  const guestCart = useGuestCart();

  if (authLoading) return 0;
  if (user) return cartCount.data?.count ?? 0;
  return guestCart.count;
}
