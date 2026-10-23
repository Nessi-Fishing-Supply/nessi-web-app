import { useQuery } from '@tanstack/react-query';
import { getWatchStatus } from '@/features/watchlist/services/watchlist';
import type { WatchStatus } from '@/features/watchlist/types/watcher';

export function useWatchStatus(listingId: string | undefined) {
  return useQuery<WatchStatus>({
    queryKey: ['watchlist', 'status', listingId],
    queryFn: () => getWatchStatus(listingId!),
    enabled: !!listingId,
  });
}
