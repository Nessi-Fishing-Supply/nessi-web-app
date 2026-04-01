import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadImages } from '@/features/messaging/services/messaging';
import type { MessageWithSender } from '@/features/messaging/types/message';
import { IMAGE_MESSAGE_PREVIEW } from '@/features/messaging/utils/constants';

type UseSendImagesOptions = {
  threadId: string;
  currentUserId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function useSendImages({
  threadId,
  currentUserId,
  onSuccess,
  onError,
}: UseSendImagesOptions) {
  const queryClient = useQueryClient();
  const messagesKey = ['messages', 'threads', threadId, 'messages'];
  const threadsKey = ['messages', 'threads'];

  return useMutation({
    mutationFn: (files: File[]) => uploadImages(threadId, files),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: messagesKey });

      const previousMessages = queryClient.getQueryData(messagesKey);

      const optimisticMessage: MessageWithSender = {
        id: crypto.randomUUID(),
        thread_id: threadId,
        sender_id: currentUserId,
        type: 'image',
        content: IMAGE_MESSAGE_PREVIEW,
        metadata: null,
        is_filtered: false,
        original_content: null,
        edited_at: null,
        created_at: new Date().toISOString(),
        sender: { id: currentUserId, first_name: '', last_name: '', avatar_url: null },
      };

      queryClient.setQueryData(messagesKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any, index: number) =>
            index === 0 ? { ...page, messages: [optimisticMessage, ...page.messages] } : page,
          ),
        };
      });

      return { previousMessages };
    },
    onError: (error, _files, context) => {
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(messagesKey, context.previousMessages);
      }
      onError?.(error instanceof Error ? error : new Error('Failed to send images'));
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey });
      queryClient.invalidateQueries({ queryKey: threadsKey });
    },
  });
}
