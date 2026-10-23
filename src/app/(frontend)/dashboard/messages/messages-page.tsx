'use client';

import { useState } from 'react';
import { useAvailableHeight } from '@/features/shared/hooks/use-available-height';
import { useRouter } from 'next/navigation';
import { HiOutlineChatAlt2 } from 'react-icons/hi';
import { useAuth } from '@/features/auth/context';
import { useThreads } from '@/features/messaging/hooks/use-threads';
import type { ThreadType } from '@/features/messaging/types/thread';
import Tabs from '@/components/controls/tabs';
import type { TabItem } from '@/components/controls/tabs';
import ThreadList from '@/features/messaging/components/thread-list';
import Button from '@/components/controls/button';
import ErrorState from '@/components/indicators/error-state';
import styles from './messages-page.module.scss';

const TAB_TYPES: (ThreadType | undefined)[] = [
  undefined,
  'inquiry',
  'offer',
  'custom_request',
  'direct',
];

const TAB_LABELS = ['All', 'Inquiries', 'Offers', 'Custom', 'Direct'];

const EMPTY_DESCRIPTIONS: Record<number, string> = {
  0: 'Start a conversation by inquiring about a listing',
  1: 'Start a conversation by inquiring about a listing',
  2: 'You have no offers yet',
  3: 'No custom requests yet',
  4: 'No direct messages yet',
};

const SKELETON_COUNT = 6;

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const activeType = TAB_TYPES[activeTabIndex];

  const { ref: shellRef, height: shellHeight } = useAvailableHeight();

  const { data: allThreads, isLoading, isError, refetch } = useThreads();

  const threads = activeType ? allThreads?.filter((t) => t.type === activeType) : allThreads;

  const tabItems: TabItem[] = TAB_LABELS.map((label, index) => {
    const type = TAB_TYPES[index];
    const relevantThreads = type ? allThreads?.filter((t) => t.type === type) : allThreads;
    const unreadCount = relevantThreads?.reduce((sum, t) => sum + t.my_unread_count, 0) ?? 0;
    return { label, count: unreadCount > 0 ? unreadCount : undefined };
  });

  const renderThreadList = () => {
    if (isLoading) {
      return (
        <div className={styles.skeleton} role="status">
          <span className="sr-only" aria-live="polite">
            Loading your messages
          </span>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLineShort} />
              </div>
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
          <Button style="primary" onClick={() => router.push('/search')}>
            Browse listings
          </Button>
        </div>
      );
    }

    if (user) {
      return (
        <ThreadList threads={threads} currentUserId={user.id} basePath="/dashboard/messages" />
      );
    }

    return null;
  };

  return (
    <div className={styles.shell} ref={shellRef} style={{ height: shellHeight }}>
      {/* Thread list panel */}
      <div className={styles.listPanel}>
        <div className={styles.listHeader}>
          <h1 className={styles.heading}>Messages</h1>
        </div>
        <div className={styles.tabsWrap}>
          <Tabs items={tabItems} activeIndex={activeTabIndex} onChange={setActiveTabIndex} />
        </div>
        <div className={styles.listContent}>{renderThreadList()}</div>
      </div>

      {/* Empty state for desktop — no thread selected */}
      <div className={styles.chatPanel}>
        <div className={styles.noThreadSelected}>
          <HiOutlineChatAlt2 className={styles.noThreadIcon} aria-hidden="true" />
          <p className={styles.noThreadText}>Select a conversation</p>
        </div>
      </div>
    </div>
  );
}
