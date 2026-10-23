import { get, post, del } from '@/libs/fetch';
import type { WatchStatus, WatchedListing } from '@/features/watchlist/types/watcher';

export const watchListing = async (listingId: string): Promise<{ success: boolean }> =>
  post<{ success: boolean }>('/api/watchlist', { listing_id: listingId });

export const unwatchListing = async (listingId: string): Promise<{ success: boolean }> =>
  del<{ success: boolean }>(`/api/watchlist?listing_id=${listingId}`);

export const getWatchStatus = async (listingId: string): Promise<WatchStatus> =>
  get<WatchStatus>(`/api/watchlist/${listingId}`);

export const getWatchedListings = async (): Promise<WatchedListing[]> =>
  get<WatchedListing[]>('/api/watchlist');
