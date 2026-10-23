'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createBroadcastChannel } from '@/libs/supabase/realtime';

interface TypingPayload {
  userId: string;
  threadId: string;
}

const TYPING_TIMEOUT_MS = 3000;

export function useTypingIndicator(threadId: string | null, currentUserId: string | null) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<{
    send: (payload: TypingPayload) => Promise<void>;
    cleanup: () => void;
  } | null>(null);

  useEffect(() => {
    if (!threadId || !currentUserId) return;

    const channel = createBroadcastChannel<TypingPayload>({
      channelName: `typing-${threadId}`,
      event: 'typing',
      onMessage: (payload) => {
        if (payload.userId === currentUserId) return;

        setIsOtherTyping(true);

        // Clear previous timeout and set a new one
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setIsOtherTyping(false);
        }, TYPING_TIMEOUT_MS);
      },
    });

    channelRef.current = channel;

    return () => {
      channel.cleanup();
      channelRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsOtherTyping(false);
    };
  }, [threadId, currentUserId]);

  const startTyping = useCallback(() => {
    if (!channelRef.current || !currentUserId || !threadId) return;
    channelRef.current.send({ userId: currentUserId, threadId });
  }, [currentUserId, threadId]);

  return { startTyping, isOtherTyping };
}
