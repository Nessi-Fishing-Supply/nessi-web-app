'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToTable } from '@/libs/supabase/realtime';
import type { MessageWithSender } from '@/features/messaging/types/message';

export function useRealtimeMessages(threadId: string | null, currentUserId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!threadId || !currentUserId) return;

    const messagesKey = ['messages', 'threads', threadId, 'messages'];

    const unsubscribe = subscribeToTable({
      table: 'messages',
      event: 'INSERT',
      filter: `thread_id=eq.${threadId}`,
      channelName: `realtime-messages-${threadId}`,
      onPayload: (payload) => {
        const newRow = payload.new;
        if (!newRow || !('id' in newRow)) return;

        // Skip messages sent by the current user — already handled by optimistic update
        if (newRow.sender_id === currentUserId) return;

        // Prepend the new message to the first page of the infinite query cache
        queryClient.setQueryData(messagesKey, (old: any) => {
          if (!old) return old;

          // Check for duplicates (in case optimistic update already added it)
          const firstPageMessages = old.pages?.[0]?.messages ?? [];
          if (firstPageMessages.some((m: MessageWithSender) => m.id === newRow.id)) {
            return old;
          }

          const realtimeMessage: MessageWithSender = {
            id: newRow.id,
            thread_id: newRow.thread_id,
            sender_id: newRow.sender_id,
            type: newRow.type,
            content: newRow.content,
            metadata: newRow.metadata,
            is_filtered: newRow.is_filtered,
            original_content: newRow.original_content,
            edited_at: newRow.edited_at,
            created_at: newRow.created_at,
            // Realtime payloads don't include joined sender data — refetch will hydrate
            sender: { id: newRow.sender_id, first_name: '', last_name: '', avatar_url: null },
          };

          return {
            ...old,
            pages: old.pages.map((page: any, index: number) =>
              index === 0 ? { ...page, messages: [realtimeMessage, ...page.messages] } : page,
            ),
          };
        });

        // Invalidate to get full sender data on the next refetch
        queryClient.invalidateQueries({ queryKey: messagesKey });
        // Also refresh thread list (last_message_preview, timestamps)
        queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
      },
    });

    return unsubscribe;
  }, [threadId, currentUserId, queryClient]);
}
