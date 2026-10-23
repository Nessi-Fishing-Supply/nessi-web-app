import { useInfiniteQuery } from '@tanstack/react-query';
import { getMessages } from '@/features/messaging/services/messaging';
import type { MessageWithSender } from '@/features/messaging/types/message';

interface MessagesPage {
  messages: MessageWithSender[];
  nextCursor: string | null;
}

export function useMessages(threadId: string | undefined) {
  return useInfiniteQuery<MessagesPage>({
    queryKey: ['messages', 'threads', threadId, 'messages'],
    queryFn: ({ pageParam }) => getMessages(threadId!, pageParam as string | undefined),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!threadId,
  });
}
