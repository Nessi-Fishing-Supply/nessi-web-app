'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToTable } from '@/libs/supabase/realtime';
import { showBrowserNotification } from '@/features/notifications/utils/browser-notifications';

export function useRealtimeNotifications(userId: string | null, enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !enabled) return;

    const unsubscribe = subscribeToTable({
      table: 'notifications',
      event: 'INSERT',
      filter: `user_id=eq.${userId}`,
      channelName: `realtime-notifications-${userId}`,
      onPayload: (payload) => {
        const newRow = payload.new;
        if (!newRow || !('id' in newRow)) return;

        // Invalidate notification queries so the panel and badge refresh
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

        // Fire browser notification if permitted
        const title = (newRow as { title?: string }).title;
        const body = (newRow as { body?: string }).body;
        if (title) {
          showBrowserNotification(title, body ?? '');
        }
      },
    });

    return unsubscribe;
  }, [userId, enabled, queryClient]);
}
