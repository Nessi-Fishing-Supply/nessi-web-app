'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { getNotificationConfig } from '@/features/notifications/utils/notification-config';
import { useMarkNotificationRead } from '@/features/notifications/hooks/use-mark-notification-read';
import type { Notification } from '@/features/notifications/types/notification';
import styles from './notification-item.module.scss';

interface NotificationItemProps {
  notification: Notification;
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const router = useRouter();
  const { mutate: markAsRead } = useMarkNotificationRead();
  const { Icon, label, colorClass } = getNotificationConfig(notification.type);

  const handleClick = () => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <button
      type="button"
      className={`${styles.root} ${!notification.is_read ? styles.unread : ''}`}
      onClick={handleClick}
      aria-label={`${label} notification: ${notification.title ?? ''}. ${notification.is_read ? 'Read' : 'Unread'}`}
    >
      <span className={`${styles.iconCircle} ${styles[colorClass]}`}>
        <Icon className={styles.icon} aria-hidden="true" />
      </span>
      <span className={styles.body}>
        <span className={`${styles.title} ${!notification.is_read ? styles.titleUnread : ''}`}>
          {notification.title}
        </span>
        <span className={styles.description}>{notification.body}</span>
      </span>
      <span className={styles.meta}>
        <span className={styles.timestamp}>{formatTimestamp(notification.created_at)}</span>
        {!notification.is_read && <span className={styles.dot} aria-hidden="true" />}
      </span>
    </button>
  );
};

export default NotificationItem;
