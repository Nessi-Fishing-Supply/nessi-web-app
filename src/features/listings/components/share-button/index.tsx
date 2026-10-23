'use client';

import { useCallback } from 'react';
import { HiOutlineShare } from 'react-icons/hi';
import { useToast } from '@/components/indicators/toast/context';
import styles from './share-button.module.scss';

type Props = {
  listingId: string;
  listingTitle: string;
};

export default function ShareButton({ listingId, listingTitle }: Props) {
  const { showToast } = useToast();

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/listing/${listingId}`;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: listingTitle, url });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast({
        type: 'success',
        message: 'Link copied!',
        description: 'The listing URL has been copied to your clipboard.',
      });
    } catch {
      showToast({
        type: 'error',
        message: 'Unable to copy link',
        description: 'Please copy the URL from your browser address bar.',
      });
    }
  }, [listingId, listingTitle, showToast]);

  return (
    <button
      type="button"
      className={styles.shareButton}
      onClick={handleShare}
      aria-label="Share this listing"
    >
      <HiOutlineShare aria-hidden="true" />
    </button>
  );
}
