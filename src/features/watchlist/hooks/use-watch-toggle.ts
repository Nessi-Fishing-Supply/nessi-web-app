import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FetchError } from '@/libs/fetch-error';
import { watchListing, unwatchListing } from '@/features/watchlist/services/watchlist';
import type { WatchStatus } from '@/features/watchlist/types/watcher';

type UseWatchToggleOptions = {
  listingId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function useWatchToggle({ listingId, onSuccess, onError }: UseWatchToggleOptions) {
  const queryClient = useQueryClient();
  const statusKey = ['watchlist', 'status', listingId];

  return useMutation({
    mutationFn: async (isCurrentlyWatching: boolean) => {
      if (isCurrentlyWatching) {
        return unwatchListing(listingId);
      }
      return watchListing(listingId);
    },
    onMutate: async (isCurrentlyWatching: boolean) => {
      await queryClient.cancelQueries({ queryKey: statusKey });

      const previousStatus = queryClient.getQueryData<WatchStatus>(statusKey);

      queryClient.setQueryData<WatchStatus>(statusKey, {
        is_watching: !isCurrentlyWatching,
      });

      return { previousStatus };
    },
    onError: (error, _isCurrentlyWatching, context) => {
      // 409/404 means the server is already in the desired state — no rollback needed
      if (error instanceof FetchError && (error.status === 409 || error.status === 404)) {
        onSuccess?.();
        return;
      }

      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(statusKey, context.previousStatus);
      }

      onError?.(error instanceof Error ? error : new Error('Failed to toggle watch'));
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: statusKey });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}
