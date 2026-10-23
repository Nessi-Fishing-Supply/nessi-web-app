import { get, post, del } from '@/libs/fetch';
import type {
  RecentlyViewedItem,
  RecentlyViewedListingItem,
} from '@/features/recently-viewed/types/recently-viewed';

const BASE_URL = '/api/recently-viewed';

export const getRecentlyViewedFromServer = async (): Promise<RecentlyViewedListingItem[]> =>
  get<RecentlyViewedListingItem[]>(BASE_URL);

export const clearRecentlyViewedOnServer = async (): Promise<{ success: boolean }> =>
  del<{ success: boolean }>(BASE_URL);

export const mergeGuestViewsOnServer = async (
  items: RecentlyViewedItem[],
): Promise<{ merged: number }> => post<{ merged: number }>(`${BASE_URL}/merge`, { items });
