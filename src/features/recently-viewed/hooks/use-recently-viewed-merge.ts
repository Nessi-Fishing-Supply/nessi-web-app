'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/context';
import { getRecentlyViewed } from '@/features/recently-viewed/utils/recently-viewed';
import { useMergeGuestViews } from '@/features/recently-viewed/hooks/use-recently-viewed-query';

export function useRecentlyViewedMerge(): void {
  const { user } = useAuth();
  const prevUserRef = useRef(user);
  const { mutate: mergeGuestViews } = useMergeGuestViews();

  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (prevUser !== null || user === null) return;

    const guestItems = getRecentlyViewed();
    if (guestItems.length === 0) return;

    // Fire-and-forget — no toast for recently viewed (passive tracking)
    mergeGuestViews(guestItems);
  }, [user, mergeGuestViews]);
}
