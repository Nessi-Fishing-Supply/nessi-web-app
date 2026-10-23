'use client';

import { HiOutlineShieldCheck } from 'react-icons/hi';

import ErrorState from '@/components/indicators/error-state';
import BlockedMemberCard from '@/features/blocks/components/blocked-member-card';
import { useBlockedMembers } from '@/features/blocks/hooks/use-blocked-members';

import styles from './blocked-members.module.scss';

export default function BlockedMembersPage() {
  const { data: blockedMembers, isLoading, isError, refetch } = useBlockedMembers();

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.heading}>Blocked Members</h1>
        </div>
        <div
          className={styles.skeletonList}
          role="status"
          aria-label="Loading blocked members list"
        >
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
          <h1 className={styles.heading}>Blocked Members</h1>
        </div>
        <ErrorState
          variant="banner"
          message="Failed to load your blocked members."
          action={{ label: 'Try again', onClick: () => refetch() }}
        />
      </div>
    );
  }

  const isEmpty = !blockedMembers || blockedMembers.length === 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Blocked Members</h1>
      </div>

      {isEmpty ? (
        <div className={styles.empty}>
          <HiOutlineShieldCheck className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyText}>You have not blocked anyone</p>
        </div>
      ) : (
        <div className={styles.list}>
          {blockedMembers.map((item) => (
            <BlockedMemberCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
