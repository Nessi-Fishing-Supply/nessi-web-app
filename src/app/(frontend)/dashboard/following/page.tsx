'use client';

import { HiOutlineHeart } from 'react-icons/hi';

import Button from '@/components/controls/button';
import AppLink from '@/components/controls/app-link';
import { useFollowing, FollowingCard } from '@/features/follows';

import styles from './following.module.scss';

export default function FollowingPage() {
  const { data: following, isLoading, isError, refetch } = useFollowing();

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.heading}>Following</h1>
        </div>
        <div className={styles.skeletonList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.heading}>Following</h1>
        </div>
        <div className={styles.empty}>
          <p className={styles.emptyText}>Failed to load your following list.</p>
          <Button style="primary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const isEmpty = !following || following.length === 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Following</h1>
      </div>

      {isEmpty ? (
        <div className={styles.empty}>
          <HiOutlineHeart className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyText}>You are not following anyone yet</p>
          <AppLink href="/">
            <Button style="primary">Browse</Button>
          </AppLink>
        </div>
      ) : (
        <div className={styles.list}>
          {following.map((item) => (
            <FollowingCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
