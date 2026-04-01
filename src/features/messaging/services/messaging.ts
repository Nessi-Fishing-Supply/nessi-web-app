import { get, post, patch } from '@/libs/fetch';
import { FetchError } from '@/libs/fetch-error';
import { handleContextRevocation } from '@/features/context/utils/handle-context-revocation';
import useContextStore from '@/features/context/stores/context-store';
import type {
  ThreadWithParticipants,
  ThreadType,
  ParticipantRole,
} from '@/features/messaging/types/thread';
import type { MessageType, MessageWithSender } from '@/features/messaging/types/message';

export const getThreads = async (type?: ThreadType): Promise<ThreadWithParticipants[]> =>
  get<ThreadWithParticipants[]>(`/api/messaging/threads${type ? `?type=${type}` : ''}`);

export const getThread = async (threadId: string): Promise<ThreadWithParticipants> =>
  get<ThreadWithParticipants>(`/api/messaging/threads/${threadId}`);

export const createThread = async (data: {
  type: ThreadType;
  participantIds: string[];
  roles: ParticipantRole[];
  listingId?: string;
  shopId?: string;
}): Promise<ThreadWithParticipants> => {
  const { activeContext } = useContextStore.getState();
  const contextHeader = activeContext.type === 'member' ? 'member' : `shop:${activeContext.shopId}`;

  const res = await fetch('/api/messaging/threads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Nessi-Context': contextHeader,
    },
    body: JSON.stringify(data),
  });

  if (res.status === 409 || res.ok) {
    return res.json() as Promise<ThreadWithParticipants>;
  }

  if (res.status === 403) {
    handleContextRevocation();
  }

  let message = `Request failed with status ${res.status}`;
  try {
    const errorData = await res.json();
    if (errorData.error) message = errorData.error;
    else if (errorData.message) message = errorData.message;
  } catch {
    // Response body is not JSON — use default message
  }
  throw new FetchError(message, res.status);
};

export const getMessages = async (
  threadId: string,
  cursor?: string,
): Promise<{ messages: MessageWithSender[]; nextCursor: string | null }> =>
  get<{ messages: MessageWithSender[]; nextCursor: string | null }>(
    `/api/messaging/threads/${threadId}/messages${cursor ? `?cursor=${cursor}` : ''}`,
  );

export const sendMessage = async (
  threadId: string,
  content: string,
  type?: MessageType,
): Promise<MessageWithSender> =>
  post<MessageWithSender>(`/api/messaging/threads/${threadId}/messages`, { content, type });

export const markThreadRead = async (threadId: string): Promise<{ success: boolean }> =>
  patch<{ success: boolean }>(`/api/messaging/threads/${threadId}/read`);

export const archiveThread = async (threadId: string): Promise<{ success: boolean }> =>
  patch<{ success: boolean }>(`/api/messaging/threads/${threadId}/archive`);

export const getUnreadCount = async (): Promise<{ count: number }> =>
  get<{ count: number }>('/api/messaging/unread-count');

export const uploadImages = async (threadId: string, files: File[]): Promise<MessageWithSender> => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  return post<MessageWithSender>(`/api/messaging/threads/${threadId}/upload`, formData);
};
