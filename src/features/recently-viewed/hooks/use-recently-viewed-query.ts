'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context';
import {
  getRecentlyViewedFromServer,
  clearRecentlyViewedOnServer,
  mergeGuestViewsOnServer,
} from '@/features/recently-viewed/services/recently-viewed';
import { clearRecentlyViewed } from '@/features/recently-viewed/utils/recently-viewed';

export function useRecentlyViewedQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['recently-viewed', user?.id],
    queryFn: getRecentlyViewedFromServer,
    enabled: !!user?.id,
  });
}

export function useClearRecentlyViewed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: clearRecentlyViewedOnServer,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recently-viewed', user?.id] });
    },
  });
}

export function useMergeGuestViews() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: mergeGuestViewsOnServer,
    onSuccess: () => {
      clearRecentlyViewed();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recently-viewed', user?.id] });
    },
  });
}
