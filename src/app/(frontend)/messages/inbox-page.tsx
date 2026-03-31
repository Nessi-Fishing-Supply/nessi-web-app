'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/context';
import { useThreads } from '@/features/messaging/hooks/use-threads';
import type { ThreadType } from '@/features/messaging/types/thread';
import Tabs from '@/components/controls/tabs';
import type { TabItem } from '@/components/controls/tabs';
import ThreadList from '@/features/messaging/components/thread-list';
import styles from './inbox-page.module.scss';

const TAB_TYPES: (ThreadType | undefined)[] = [
  undefined,
  'inquiry',
  'offer',
  'custom_request',
  'direct',
];

const TAB_LABELS = ['All', 'Inquiries', 'Offers', 'Custom Requests', 'Direct'];

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

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Messages</h1>
      <Tabs items={tabItems} activeIndex={activeTabIndex} onChange={setActiveTabIndex} />
      <div className={styles.content}>
        {threads && threads.length > 0 && user && (
          <ThreadList threads={threads} currentUserId={user.id} />
        )}
      </div>
    </div>
  );
}
