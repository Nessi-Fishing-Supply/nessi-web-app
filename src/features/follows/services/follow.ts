import { get, post, del } from '@/libs/fetch';
import type {
  Follow,
  FollowTargetType,
  FollowStatus,
  FollowerCount,
  FollowingItem,
} from '@/features/follows/types/follow';

export const followTarget = async (
  targetType: FollowTargetType,
  targetId: string,
): Promise<Follow> =>
  post<Follow>('/api/follows', { target_type: targetType, target_id: targetId });

export const unfollowTarget = async (
  targetType: FollowTargetType,
  targetId: string,
): Promise<{ success: boolean }> =>
  del<{ success: boolean }>(`/api/follows?target_type=${targetType}&target_id=${targetId}`);

export const getFollowStatus = async (
  targetType: FollowTargetType,
  targetId: string,
): Promise<FollowStatus> =>
  get<FollowStatus>(`/api/follows/status?target_type=${targetType}&target_id=${targetId}`);

export const getFollowerCount = async (
  targetType: FollowTargetType,
  targetId: string,
): Promise<FollowerCount> =>
  get<FollowerCount>(`/api/follows/count?target_type=${targetType}&target_id=${targetId}`);

export const getFollowing = async (targetType?: FollowTargetType): Promise<FollowingItem[]> =>
  get<FollowingItem[]>(`/api/follows/following${targetType ? `?target_type=${targetType}` : ''}`);
