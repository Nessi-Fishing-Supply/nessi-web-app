'use client';

import React from 'react';
import { HiShoppingBag, HiTag, HiChat, HiTrendingDown, HiStar } from 'react-icons/hi';
import styles from './notification-row.module.scss';

interface NotificationRowProps {
  type: 'sale' | 'offer' | 'message' | 'price-drop' | 'review';
  title: string;
  description: string;
  timestamp: Date;
  isRead: boolean;
  onClick?: () => void;
  className?: string;
}

const typeConfig = {
  sale: { Icon: HiShoppingBag, label: 'Sale' },
  offer: { Icon: HiTag, label: 'Offer' },
  message: { Icon: HiChat, label: 'Message' },
  'price-drop': { Icon: HiTrendingDown, label: 'Price drop' },
  review: { Icon: HiStar, label: 'Review' },
};

function formatTimestamp(date: Date): string {
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

const NotificationRow: React.FC<NotificationRowProps> = ({
  type,
  title,
  description,
  timestamp,
  isRead,
  onClick,
  className,
}) => {
  const { Icon, label } = typeConfig[type];

  return (
    <button
      type="button"
      className={`${styles.root} ${!isRead ? styles.unread : ''} ${className ?? ''}`}
      onClick={onClick}
      aria-label={`${label} notification: ${title}. ${isRead ? 'Read' : 'Unread'}`}
    >
      <span className={`${styles.iconCircle} ${styles[type]}`}>
        <Icon className={styles.icon} aria-hidden="true" />
      </span>
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
      </span>
      <span className={styles.meta}>
        <span className={styles.timestamp}>{formatTimestamp(timestamp)}</span>
        {!isRead && <span className={styles.dot} aria-hidden="true" />}
      </span>
    </button>
  );
};

export default NotificationRow;
