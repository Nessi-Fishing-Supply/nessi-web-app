'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  getRecentlyViewed,
  addRecentlyViewed,
  clearRecentlyViewed,
  subscribe,
} from '@/features/recently-viewed/utils/recently-viewed';
import type { RecentlyViewedItem } from '@/features/recently-viewed/types/recently-viewed';

const EMPTY_ITEMS: RecentlyViewedItem[] = [];

let cachedJson = '';
let cachedItems: RecentlyViewedItem[] = EMPTY_ITEMS;

function getSnapshot(): RecentlyViewedItem[] {
  const items = getRecentlyViewed();
  const json = JSON.stringify(items);
  if (json !== cachedJson) {
    cachedJson = json;
    cachedItems = items;
  }
  return cachedItems;
}

function getServerSnapshot(): RecentlyViewedItem[] {
  return EMPTY_ITEMS;
}

export function useRecentlyViewed() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((listingId: string) => {
    return addRecentlyViewed(listingId);
  }, []);

  const clear = useCallback(() => {
    return clearRecentlyViewed();
  }, []);

  return { items, add, clear };
}
