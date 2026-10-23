import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '@/features/messaging/services/messaging';

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: getUnreadCount,
    enabled,
  });
}
