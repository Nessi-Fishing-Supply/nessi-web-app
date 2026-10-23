import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAsRead } from '@/features/notifications/services/notifications';
import type { NotificationsResponse } from '@/features/notifications/types/notification';

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const notificationsKey = ['notifications'];
  const unreadKey = ['notifications', 'unread-count'];

  return useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notificationsKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });

      const previousNotifications =
        queryClient.getQueryData<NotificationsResponse>(notificationsKey);
      const previousCount = queryClient.getQueryData<{ count: number }>(unreadKey);

      queryClient.setQueryData<NotificationsResponse>(notificationsKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n,
          ),
        };
      });

      queryClient.setQueryData<{ count: number }>(unreadKey, (old) => {
        if (!old) return old;
        return { count: Math.max(0, old.count - 1) };
      });

      return { previousNotifications, previousCount };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousNotifications !== undefined) {
        queryClient.setQueryData(notificationsKey, context.previousNotifications);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(unreadKey, context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });
}
