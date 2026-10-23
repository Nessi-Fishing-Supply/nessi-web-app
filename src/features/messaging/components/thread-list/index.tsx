'use client';

import type { ThreadWithParticipants } from '@/features/messaging/types/thread';
import ThreadRow from './thread-row';
import styles from './thread-list.module.scss';

interface ThreadListProps {
  threads: ThreadWithParticipants[];
  currentUserId: string;
  activeThreadId?: string;
  basePath?: string;
}

export default function ThreadList({
  threads,
  currentUserId,
  activeThreadId,
  basePath,
}: ThreadListProps) {
  return (
    <ul className={styles.list}>
      {threads.map((thread) => (
        <li key={thread.id}>
          <ThreadRow
            thread={thread}
            currentUserId={currentUserId}
            isActive={thread.id === activeThreadId}
            basePath={basePath}
          />
        </li>
      ))}
    </ul>
  );
}
