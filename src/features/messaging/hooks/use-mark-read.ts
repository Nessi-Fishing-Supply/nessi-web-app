import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markThreadRead } from '@/features/messaging/services/messaging';
import type { ThreadWithParticipants } from '@/features/messaging/types/thread';

export function useMarkRead() {
  const queryClient = useQueryClient();
  const threadsKey = ['messages', 'threads'];
  const unreadKey = ['messages', 'unread-count'];

  return useMutation({
    mutationFn: (threadId: string) => markThreadRead(threadId),
    onMutate: async (threadId: string) => {
      await queryClient.cancelQueries({ queryKey: threadsKey });

      const previousThreads: Record<string, unknown> = {};

      const threadQueries = queryClient.getQueriesData<ThreadWithParticipants[]>({
        queryKey: threadsKey,
      });

      for (const [key, data] of threadQueries) {
        if (!data) continue;
        const keyStr = JSON.stringify(key);
        previousThreads[keyStr] = data;

        queryClient.setQueryData<ThreadWithParticipants[]>(
          key,
          data.map((thread) =>
            thread.id === threadId ? { ...thread, my_unread_count: 0 } : thread,
          ),
        );
      }

      return { previousThreads };
    },
    onError: (_error, _threadId, context) => {
      if (context?.previousThreads) {
        for (const [keyStr, data] of Object.entries(context.previousThreads)) {
          queryClient.setQueryData(JSON.parse(keyStr), data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: threadsKey });
      queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });
}
