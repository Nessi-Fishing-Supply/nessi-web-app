import { useQuery } from '@tanstack/react-query';
import { getWatchedListings } from '@/features/watchlist/services/watchlist';
import type { WatchedListing } from '@/features/watchlist/types/watcher';

export function useWatchlist() {
  return useQuery<WatchedListing[]>({
    queryKey: ['watchlist'],
    queryFn: getWatchedListings,
  });
}
