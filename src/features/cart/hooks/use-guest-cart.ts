'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  getGuestCart,
  addToGuestCart,
  removeFromGuestCart,
  clearGuestCart,
  isInGuestCart,
  subscribe,
} from '@/features/cart/utils/guest-cart';
import type { GuestCartItem } from '@/features/cart/types/cart';

const EMPTY_CART: GuestCartItem[] = [];

let cachedJson = '';
let cachedItems: GuestCartItem[] = EMPTY_CART;

function getSnapshot(): GuestCartItem[] {
  const items = getGuestCart();
  const json = JSON.stringify(items);
  if (json !== cachedJson) {
    cachedJson = json;
    cachedItems = items;
  }
  return cachedItems;
}

function getServerSnapshot(): GuestCartItem[] {
  return EMPTY_CART;
}

export function useGuestCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((item: GuestCartItem) => {
    return addToGuestCart(item);
  }, []);

  const remove = useCallback((listingId: string) => {
    removeFromGuestCart(listingId);
  }, []);

  const clear = useCallback(() => {
    clearGuestCart();
  }, []);

  const isInCart = useCallback((listingId: string) => {
    return isInGuestCart(listingId);
  }, []);

  return {
    items,
    count: items.length,
    add,
    remove,
    clear,
    isInCart,
  };
}
