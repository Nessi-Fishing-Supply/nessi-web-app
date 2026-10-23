import { useQuery } from '@tanstack/react-query';
import { getThread } from '@/features/messaging/services/messaging';
import type { ThreadWithParticipants } from '@/features/messaging/types/thread';

export function useThread(threadId: string | undefined) {
  return useQuery<ThreadWithParticipants>({
    queryKey: ['messages', 'threads', threadId],
    queryFn: () => getThread(threadId!),
    enabled: !!threadId,
  });
}
