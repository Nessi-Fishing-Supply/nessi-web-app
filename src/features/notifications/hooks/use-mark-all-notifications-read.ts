import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAllAsRead } from '@/features/notifications/services/notifications';
import type { NotificationsResponse } from '@/features/notifications/types/notification';

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const notificationsKey = ['notifications'];
  const unreadKey = ['notifications', 'unread-count'];

  return useMutation({
    mutationFn: () => markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsKey });
      await queryClient.cancelQueries({ queryKey: unreadKey });

      const previousNotifications =
        queryClient.getQueryData<NotificationsResponse>(notificationsKey);
      const previousCount = queryClient.getQueryData<{ count: number }>(unreadKey);

      queryClient.setQueryData<NotificationsResponse>(notificationsKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n) => ({ ...n, is_read: true })),
        };
      });

      queryClient.setQueryData<{ count: number }>(unreadKey, () => ({ count: 0 }));

      return { previousNotifications, previousCount };
    },
    onError: (_error, _vars, context) => {
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
