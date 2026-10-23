'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import ListingGrid from '../listing-grid';
import ListingSkeleton from '../listing-skeleton';
import styles from './infinite-scroll.module.scss';

interface InfiniteScrollProps {
  children: ReactNode;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  endMessage?: string;
}

export default function InfiniteScroll({
  children,
  onLoadMore,
  hasMore,
  isLoading,
  endMessage = "You've seen everything",
}: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMoreRef.current && !isLoadingRef.current) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin: '0px 0px 200px 0px' },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div>
      {children}
      {isLoading && (
        <ListingGrid>
          <ListingSkeleton count={4} />
        </ListingGrid>
      )}
      {!hasMore && !isLoading && (
        <p className={styles.endMessage} role="status">
          {endMessage}
        </p>
      )}
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
    </div>
  );
}
