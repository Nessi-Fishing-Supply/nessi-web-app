'use client';

import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { HiOutlineBell } from 'react-icons/hi';
import { useAuth } from '@/features/auth/context';
import { useUnreadNotificationCount } from '@/features/notifications/hooks/use-unread-notification-count';
import { useRealtimeNotifications } from '@/features/notifications/hooks/use-realtime-notifications';
import styles from './notification-bell.module.scss';

const NotificationPanel = dynamic(
  () => import('@/features/notifications/components/notification-panel'),
  { ssr: false },
);

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { data: unreadData } = useUnreadNotificationCount();
  useRealtimeNotifications(user?.id ?? null, true);
  const unreadCount = unreadData?.count ?? 0;

  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  const ariaLabel = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.bellButton}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <HiOutlineBell className={styles.icon} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {badgeText}
          </span>
        )}
      </button>
      {isOpen && <NotificationPanel onClose={() => setIsOpen(false)} />}
    </div>
  );
}
