'use client';

import Link from 'next/link';
import { HiCamera } from 'react-icons/hi';
import Avatar from '@/components/controls/avatar';
import TypeBadge from '@/features/messaging/components/type-badge';
import { isOnline } from '@/features/messaging/hooks/use-online-status';
import { IMAGE_MESSAGE_PREVIEW } from '@/features/messaging/utils/constants';
import type { ThreadWithParticipants } from '@/features/messaging/types/thread';
import styles from './thread-row.module.scss';

interface ThreadRowProps {
  thread: ThreadWithParticipants;
  currentUserId: string;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 48) return 'Yesterday';

  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ThreadRow({ thread, currentUserId }: ThreadRowProps) {
  const other = thread.participants.find((p) => p.member.id !== currentUserId);
  const name = other ? `${other.member.first_name} ${other.member.last_name}` : 'Unknown';
  const avatarUrl = other?.member.avatar_url ?? undefined;
  const isUnread = thread.my_unread_count > 0;
  const otherIsOnline = isOnline(other?.member.last_seen_at ?? null);

  return (
    <Link href={`/messages/${thread.id}`} className={styles.row}>
      <div className={styles.avatarWrap}>
        <Avatar name={name} imageUrl={avatarUrl} size="md" isOnline={otherIsOnline} />
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={`${styles.name}${isUnread ? ` ${styles.unread}` : ''}`}>{name}</span>
          <TypeBadge type={thread.type} />
        </div>
        <p className={styles.preview}>
          {thread.last_message_preview === IMAGE_MESSAGE_PREVIEW && (
            <HiCamera aria-hidden="true" className={styles.previewIcon} />
          )}
          {thread.last_message_preview ?? ''}
        </p>
      </div>
      <div className={styles.meta}>
        <time className={styles.timestamp} dateTime={thread.last_message_at ?? undefined}>
          {formatRelativeTime(thread.last_message_at)}
        </time>
        {isUnread && (
          <>
            <span className={styles.dot} aria-hidden="true" />
            <span className="sr-only">Unread</span>
          </>
        )}
      </div>
    </Link>
  );
}
