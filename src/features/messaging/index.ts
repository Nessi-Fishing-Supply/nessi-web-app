export type {
  MessageThread,
  MessageThreadInsert,
  ThreadType,
  ThreadStatus,
  ThreadParticipant,
  ParticipantRole,
  ThreadWithParticipants,
} from '@/features/messaging/types/thread';

export type {
  Message,
  MessageInsert,
  MessageType,
  MessageWithSender,
} from '@/features/messaging/types/message';

export {
  getThreads,
  getThread,
  createThread,
  getMessages,
  sendMessage,
  markThreadRead,
  archiveThread,
  getUnreadCount,
} from '@/features/messaging/services/messaging';
