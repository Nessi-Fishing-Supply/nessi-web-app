import type { FollowTargetType } from '@/features/follows/types/follow';

export type FollowButtonProps = {
  targetType: FollowTargetType;
  targetId: string;
  targetName: string;
  initialFollowerCount?: number;
  size?: 'sm' | 'md';
  className?: string;
};
