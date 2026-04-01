'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToTable } from '@/libs/supabase/realtime';

export function useRealtimeUnreadCount(userId: string | null, enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !enabled) return;

    const unsubscribe = subscribeToTable({
      table: 'message_thread_participants',
      event: 'UPDATE',
      filter: `member_id=eq.${userId}`,
      channelName: `realtime-unread-${userId}`,
      onPayload: () => {
        // Invalidate unread count and thread list so the UI refreshes
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
      },
    });

    return unsubscribe;
  }, [userId, enabled, queryClient]);
}
