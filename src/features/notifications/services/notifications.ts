import { get, patch } from '@/libs/fetch';
import type { NotificationsResponse } from '@/features/notifications/types/notification';

export const getNotifications = async (
  limit?: number,
  offset?: number,
): Promise<NotificationsResponse> => {
  const params = new URLSearchParams();
  if (limit !== undefined) params.append('limit', String(limit));
  if (offset !== undefined) params.append('offset', String(offset));
  const query = params.toString();
  return get<NotificationsResponse>(`/api/notifications${query ? `?${query}` : ''}`);
};

export const getUnreadCount = async (): Promise<{ count: number }> =>
  get<{ count: number }>('/api/notifications/unread-count');

export const markAsRead = async (notificationId: string): Promise<{ success: boolean }> =>
  patch<{ success: boolean }>(`/api/notifications/${notificationId}/read`);

export const markAllAsRead = async (): Promise<{ success: boolean }> =>
  patch<{ success: boolean }>('/api/notifications/read-all');
