'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/features/auth/context';
import { useToast } from '@/components/indicators/toast/context';
import { useFollowStatus } from '@/features/follows/hooks/use-follow-status';
import { useFollowerCount } from '@/features/follows/hooks/use-follower-count';
import { useFollowToggle } from '@/features/follows/hooks/use-follow-toggle';
import type { FollowButtonProps } from '@/features/follows/types/follow-button';

import styles from './follow-button.module.scss';

export default function FollowButton({
  targetType,
  targetId,
  targetName,
  initialFollowerCount,
  size = 'md',
  className,
}: FollowButtonProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const [isHovered, setIsHovered] = useState(false);

  const { data: statusData, isLoading: isStatusLoading } = useFollowStatus(targetType, targetId);
  const { data: countData } = useFollowerCount(targetType, targetId);

  const isFollowing = statusData?.is_following ?? false;
  const followerCount = countData?.count ?? initialFollowerCount;

  const { mutate, isPending } = useFollowToggle({
    targetType,
    targetId,
    onError: () => {
      showToast({
        message: 'Something went wrong',
        description: 'Please try again.',
        type: 'error',
      });
    },
  });

  const handleClick = useCallback(() => {
    if (!isAuthenticated) {
      showToast({
        message: 'Sign in to follow',
        description: `Create an account or sign in to follow ${targetName}.`,
        type: 'error',
      });
      return;
    }
    const wasFollowing = isFollowing;
    mutate(isFollowing);
    if (wasFollowing) {
      showToast({
        message: 'Unfollowed',
        description: `You unfollowed ${targetName}.`,
        type: 'success',
      });
    } else {
      showToast({
        message: 'Following',
        description: `You are now following ${targetName}.`,
        type: 'success',
      });
    }
  }, [isAuthenticated, isFollowing, mutate, showToast, targetName]);

  const isDisabled = isPending || isAuthLoading || isStatusLoading;

  let buttonText = 'Follow';
  if (isFollowing) {
    buttonText = isHovered ? 'Unfollow' : 'Following';
  }

  const ariaLabel = isFollowing
    ? `Following ${targetName}, activate to unfollow`
    : `Follow ${targetName}`;

  const buttonClassName = [
    styles.button,
    styles[size],
    isFollowing ? styles.following : '',
    isFollowing && isHovered ? styles.hovering : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={buttonClassName}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        disabled={isDisabled}
        aria-pressed={isFollowing}
        aria-label={ariaLabel}
        aria-busy={isPending}
      >
        {buttonText}
      </button>
      {followerCount !== undefined && (
        <span className={styles.count}>{followerCount.toLocaleString()}</span>
      )}
    </div>
  );
}
