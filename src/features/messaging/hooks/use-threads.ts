import { useQuery } from '@tanstack/react-query';
import { getThreads } from '@/features/messaging/services/messaging';
import type { ThreadType } from '@/features/messaging/types/thread';

export function useThreads(type?: ThreadType) {
  return useQuery({
    queryKey: ['messages', 'threads', type],
    queryFn: () => getThreads(type),
  });
}
