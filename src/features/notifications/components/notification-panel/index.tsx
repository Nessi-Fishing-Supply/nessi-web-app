'use client';

import { useEffect, useRef } from 'react';
import { HiCheckCircle, HiOutlineX } from 'react-icons/hi';
import NotificationItem from '@/features/notifications/components/notification-item';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { useMarkAllNotificationsRead } from '@/features/notifications/hooks/use-mark-all-notifications-read';
import type { Notification } from '@/features/notifications/types/notification';
import styles from './notification-panel.module.scss';

interface NotificationPanelProps {
  onClose: () => void;
}

function SkeletonItems() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles.skeleton}>
          <div className={styles.skeletonCircle} />
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonLine} style={{ width: '60%' }} />
            <div className={styles.skeletonLine} style={{ width: '90%' }} />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <HiCheckCircle className={styles.emptyIcon} aria-hidden="true" />
      <span className={styles.emptyText}>You&apos;re all caught up!</span>
    </div>
  );
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications: Notification[] = data?.notifications ?? [];
  const hasUnread = notifications.some((n) => !n.is_read);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap for mobile overlay
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.panel} role="dialog" aria-label="Notifications" ref={panelRef}>
      <div className={styles.header}>
        <h2 className={styles.title}>Notifications</h2>
        <div className={styles.headerActions}>
          {hasUnread && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className={styles.markAllRead}
            >
              Mark all as read
            </button>
          )}
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close notifications"
          >
            <HiOutlineX aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={styles.list}>
        {isLoading ? (
          <SkeletonItems />
        ) : notifications.length === 0 ? (
          <EmptyState />
        ) : (
          notifications.map((n) => <NotificationItem key={n.id} notification={n} />)
        )}
      </div>
    </div>
  );
}
