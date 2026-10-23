import { useQuery } from '@tanstack/react-query';
import { getNotifications } from '@/features/notifications/services/notifications';

export function useNotifications(limit = 20) {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(limit),
  });
}
