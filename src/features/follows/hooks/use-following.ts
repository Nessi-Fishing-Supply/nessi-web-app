import { useQuery } from '@tanstack/react-query';
import { getFollowing } from '@/features/follows/services/follow';
import type { FollowTargetType } from '@/features/follows/types/follow';

export function useFollowing(targetType?: FollowTargetType) {
  return useQuery({
    queryKey: ['follows', 'following', targetType],
    queryFn: () => getFollowing(targetType),
  });
}
