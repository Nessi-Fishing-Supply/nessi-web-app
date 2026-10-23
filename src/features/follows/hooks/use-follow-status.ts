import { useQuery } from '@tanstack/react-query';
import { getFollowStatus } from '@/features/follows/services/follow';
import type { FollowTargetType } from '@/features/follows/types/follow';

export function useFollowStatus(
  targetType: FollowTargetType | undefined,
  targetId: string | undefined,
) {
  return useQuery({
    queryKey: ['follows', 'status', targetType, targetId],
    queryFn: () => getFollowStatus(targetType!, targetId!),
    enabled: !!targetType && !!targetId,
  });
}
