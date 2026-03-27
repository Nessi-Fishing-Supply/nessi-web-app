import { useQuery } from '@tanstack/react-query';
import { getFollowerCount } from '@/features/follows/services/follow';
import type { FollowTargetType } from '@/features/follows/types/follow';

export function useFollowerCount(
  targetType: FollowTargetType | undefined,
  targetId: string | undefined,
) {
  return useQuery({
    queryKey: ['follows', 'count', targetType, targetId],
    queryFn: () => getFollowerCount(targetType!, targetId!),
    enabled: !!targetType && !!targetId,
  });
}
