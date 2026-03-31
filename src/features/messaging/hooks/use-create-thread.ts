import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FetchError } from '@/libs/fetch-error';
import { createThread } from '@/features/messaging/services/messaging';
import type {
  ThreadWithParticipants,
  ThreadType,
  ParticipantRole,
} from '@/features/messaging/types/thread';

type CreateThreadParams = {
  type: ThreadType;
  participantIds: string[];
  roles: ParticipantRole[];
  listingId?: string;
  shopId?: string;
};

type UseCreateThreadOptions = {
  onSuccess?: (thread: ThreadWithParticipants) => void;
  onError?: (error: Error) => void;
};

export function useCreateThread({ onSuccess, onError }: UseCreateThreadOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateThreadParams) => createThread(params),
    onError: (error) => {
      if (error instanceof FetchError && error.status === 409) {
        return;
      }
      onError?.(error instanceof Error ? error : new Error('Failed to create thread'));
    },
    onSuccess: (thread) => {
      onSuccess?.(thread);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
    },
  });
}
