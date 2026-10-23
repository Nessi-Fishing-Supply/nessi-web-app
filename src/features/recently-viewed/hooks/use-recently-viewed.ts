'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@/features/auth/context';
import {
  getRecentlyViewed,
  addRecentlyViewed,
  clearRecentlyViewed,
  subscribe,
} from '@/features/recently-viewed/utils/recently-viewed';
import { useRecentlyViewedQuery, useClearRecentlyViewed } from './use-recently-viewed-query';
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
  const { user, isLoading: authLoading } = useAuth();

  // Always call hooks unconditionally (rules of hooks)
  const { data: dbItems } = useRecentlyViewedQuery();
  const { mutate: clearDb } = useClearRecentlyViewed();
  const guestItems = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Map DB items to RecentlyViewedItem shape for backward compat
  const authItems = useMemo<RecentlyViewedItem[]>(() => {
    if (!dbItems) return EMPTY_ITEMS;
    return dbItems.map((item) => ({
      listingId: item.listingId,
      viewedAt: item.viewedAt,
    }));
  }, [dbItems]);

  // Authenticated path
  if (user) {
    return {
      items: authItems,
      // DB persistence happens in POST /api/listings/[id]/view, not here
      add: () => {},
      clear: () => clearDb(),
    };
  }

  // Loading state — return empty to prevent flash
  if (authLoading) {
    return { items: EMPTY_ITEMS, add: () => {}, clear: () => {} };
  }

  // Guest path — existing localStorage implementation
  return {
    items: guestItems,
    add: (listingId: string) => addRecentlyViewed(listingId),
    clear: () => clearRecentlyViewed(),
  };
}
