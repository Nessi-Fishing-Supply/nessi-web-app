export type {
  Notification,
  NotificationInsert,
  NotificationType,
  NotificationsResponse,
} from '@/features/notifications/types/notification';

export {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/features/notifications/services/notifications';

export { useNotifications } from '@/features/notifications/hooks/use-notifications';
export { useUnreadNotificationCount } from '@/features/notifications/hooks/use-unread-notification-count';
export { useMarkNotificationRead } from '@/features/notifications/hooks/use-mark-notification-read';
export { useMarkAllNotificationsRead } from '@/features/notifications/hooks/use-mark-all-notifications-read';
