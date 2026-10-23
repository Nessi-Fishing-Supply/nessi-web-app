'use client';

import { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { useAuth } from '@/features/auth/context';
import { useToast } from '@/components/indicators/toast/context';
import { useWatchStatus } from '@/features/watchlist/hooks/use-watch-status';
import { useWatchToggle } from '@/features/watchlist/hooks/use-watch-toggle';
import styles from './watch-button.module.scss';

interface WatchButtonProps {
  listingId: string;
  className?: string;
}

export default function WatchButton({ listingId, className }: WatchButtonProps) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const { data: statusData, isLoading: isStatusLoading } = useWatchStatus(listingId);
  const isWatching = statusData?.is_watching ?? false;

  const { mutate, isPending } = useWatchToggle({
    listingId,
    onError: () => {
      showToast({
        type: 'error',
        message: 'Something went wrong',
        description: 'Please try again.',
      });
    },
  });

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!isAuthenticated) {
        router.push(`${pathname}?login=true`);
        return;
      }

      const wasWatching = isWatching;
      mutate(isWatching);

      if (wasWatching) {
        showToast({
          type: 'success',
          message: 'Removed from Watchlist',
          description: 'You will no longer receive alerts.',
        });
      } else {
        showToast({
          type: 'success',
          message: 'Added to Watchlist',
          description: "We'll tell you if the price drops.",
        });
      }
    },
    [isAuthenticated, isWatching, mutate, pathname, router, showToast],
  );

  const isDisabled = isPending || isStatusLoading;
  const ariaLabel = isWatching ? 'Remove from watchlist' : 'Add to watchlist';

  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(' ')}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-pressed={isWatching}
      aria-busy={isPending}
    >
      {isWatching ? (
        <FaHeart className={styles.iconWatched} aria-hidden="true" />
      ) : (
        <FaRegHeart className={styles.iconDefault} aria-hidden="true" />
      )}
    </button>
  );
}
