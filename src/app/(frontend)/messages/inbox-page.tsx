'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HiOutlineChatAlt2 } from 'react-icons/hi';
import { useAuth } from '@/features/auth/context';
import { useThreads } from '@/features/messaging/hooks/use-threads';
import type { ThreadType } from '@/features/messaging/types/thread';
import Tabs from '@/components/controls/tabs';
import type { TabItem } from '@/components/controls/tabs';
import ThreadList from '@/features/messaging/components/thread-list';
import Button from '@/components/controls/button';
import ErrorState from '@/components/indicators/error-state';
import styles from './inbox-page.module.scss';

const TAB_TYPES: (ThreadType | undefined)[] = [
  undefined,
  'inquiry',
  'offer',
  'custom_request',
  'direct',
];

const TAB_LABELS = ['All', 'Inquiries', 'Offers', 'Custom Requests', 'Direct'];

const EMPTY_DESCRIPTIONS: Record<number, string> = {
  0: 'Start a conversation by inquiring about a listing',
  1: 'Start a conversation by inquiring about a listing',
  2: 'You have no offers yet',
  3: 'No custom requests yet',
  4: 'No direct messages yet',
};

const SKELETON_COUNT = 5;

export default function InboxPage() {
  const { user } = useAuth();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const activeType = TAB_TYPES[activeTabIndex];

  const { data: allThreads } = useThreads();
  const { data: threads, isLoading, isError, refetch } = useThreads(activeType);

  const tabItems: TabItem[] = TAB_LABELS.map((label, index) => {
    const type = TAB_TYPES[index];
    const relevantThreads = type ? allThreads?.filter((t) => t.type === type) : allThreads;
    const unreadCount = relevantThreads?.reduce((sum, t) => sum + t.my_unread_count, 0) ?? 0;
    return { label, count: unreadCount > 0 ? unreadCount : undefined };
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={styles.skeleton} role="status">
          <span className="sr-only" role="status" aria-live="polite">
            Loading your messages
          </span>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLineShort} />
              </div>
              <div className={styles.skeletonTimestamp} />
            </div>
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <ErrorState
          variant="banner"
          message="Something went wrong loading your messages"
          action={{ label: 'Retry', onClick: () => refetch() }}
        />
      );
    }

    if (!threads || threads.length === 0) {
      return (
        <div className={styles.emptyState}>
          <HiOutlineChatAlt2 className={styles.emptyIcon} aria-hidden="true" />
          <h2 className={styles.emptyHeading}>No messages yet</h2>
          <p className={styles.emptyText}>{EMPTY_DESCRIPTIONS[activeTabIndex]}</p>
          <Link href="/search">
            <Button style="primary">Browse listings</Button>
          </Link>
        </div>
      );
    }

    if (user) {
      return <ThreadList threads={threads} currentUserId={user.id} />;
    }

    return null;
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Messages</h1>
      <Tabs items={tabItems} activeIndex={activeTabIndex} onChange={setActiveTabIndex} />
      <div className={styles.content}>{renderContent()}</div>
    </div>
  );
}
