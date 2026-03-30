import { get, post, patch } from '@/libs/fetch';
import type { ThreadWithParticipants, ThreadType } from '@/features/messaging/types/thread';
import type { MessageType, MessageWithSender } from '@/features/messaging/types/message';

export const getThreads = async (type?: ThreadType): Promise<ThreadWithParticipants[]> =>
  get<ThreadWithParticipants[]>(`/api/messaging/threads${type ? `?type=${type}` : ''}`);

export const getThread = async (threadId: string): Promise<ThreadWithParticipants> =>
  get<ThreadWithParticipants>(`/api/messaging/threads/${threadId}`);

export const createThread = async (data: {
  type: ThreadType;
  participantIds: string[];
  roles: string[];
  listingId?: string;
  shopId?: string;
}): Promise<ThreadWithParticipants> => post<ThreadWithParticipants>('/api/messaging/threads', data);

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

export const markThreadRead = async (threadId: string): Promise<void> =>
  patch<void>(`/api/messaging/threads/${threadId}/read`);

export const archiveThread = async (threadId: string): Promise<void> =>
  patch<void>(`/api/messaging/threads/${threadId}/archive`);

export const getUnreadCount = async (): Promise<{ count: number }> =>
  get<{ count: number }>('/api/messaging/unread-count');
