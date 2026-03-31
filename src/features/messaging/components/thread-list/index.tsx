'use client';

import type { ThreadWithParticipants } from '@/features/messaging/types/thread';
import ThreadRow from './thread-row';
import styles from './thread-list.module.scss';

interface ThreadListProps {
  threads: ThreadWithParticipants[];
  currentUserId: string;
}

export default function ThreadList({ threads, currentUserId }: ThreadListProps) {
  return (
    <ul className={styles.list}>
      {threads.map((thread) => (
        <li key={thread.id}>
          <ThreadRow thread={thread} currentUserId={currentUserId} />
        </li>
      ))}
    </ul>
  );
}
