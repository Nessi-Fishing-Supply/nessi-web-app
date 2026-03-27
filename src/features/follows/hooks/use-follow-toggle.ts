import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FetchError } from '@/libs/fetch-error';
import { followTarget, unfollowTarget } from '@/features/follows/services/follow';
import type {
  FollowTargetType,
  FollowStatus,
  FollowerCount,
} from '@/features/follows/types/follow';

type UseFollowToggleOptions = {
  targetType: FollowTargetType;
  targetId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function useFollowToggle({
  targetType,
  targetId,
  onSuccess,
  onError,
}: UseFollowToggleOptions) {
  const queryClient = useQueryClient();
  const statusKey = ['follows', 'status', targetType, targetId];
  const countKey = ['follows', 'count', targetType, targetId];

  return useMutation({
    mutationFn: async (isCurrentlyFollowing: boolean) => {
      if (isCurrentlyFollowing) {
        return unfollowTarget(targetType, targetId);
      }
      return followTarget(targetType, targetId);
    },
    onMutate: async (isCurrentlyFollowing: boolean) => {
      await queryClient.cancelQueries({ queryKey: statusKey });
      await queryClient.cancelQueries({ queryKey: countKey });

      const previousStatus = queryClient.getQueryData<FollowStatus>(statusKey);
      const previousCount = queryClient.getQueryData<FollowerCount>(countKey);

      queryClient.setQueryData<FollowStatus>(statusKey, {
        is_following: !isCurrentlyFollowing,
      });

      if (previousCount !== undefined) {
        queryClient.setQueryData<FollowerCount>(countKey, {
          count: isCurrentlyFollowing
            ? Math.max(previousCount.count - 1, 0)
            : previousCount.count + 1,
        });
      }

      return { previousStatus, previousCount };
    },
    onError: (error, _isCurrentlyFollowing, context) => {
      // 409/404 means the server is already in the desired state — no rollback needed
      if (error instanceof FetchError && (error.status === 409 || error.status === 404)) {
        onSuccess?.();
        return;
      }

      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(statusKey, context.previousStatus);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(countKey, context.previousCount);
      }

      onError?.(error instanceof Error ? error : new Error('Failed to toggle follow'));
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: statusKey });
      queryClient.invalidateQueries({ queryKey: countKey });
      queryClient.invalidateQueries({ queryKey: ['follows', 'following'] });
    },
  });
}
