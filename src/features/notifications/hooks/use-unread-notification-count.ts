import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '@/features/notifications/services/notifications';

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    enabled,
  });
}
