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

export type {
  Offer,
  OfferInsert,
  OfferStatus,
  OfferWithDetails,
  CreateOfferParams,
  CounterOfferParams,
} from '@/features/messaging/types/offer';

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

export {
  createOffer,
  getOffer,
  acceptOffer,
  declineOffer,
  counterOffer,
} from '@/features/messaging/services/offers';

export type { MemberBlock, MemberBlockInsert } from '@/features/messaging/types/block';

export { blockMember, unblockMember } from '@/features/messaging/services/blocks';

export { useThreads } from '@/features/messaging/hooks/use-threads';
export { useThread } from '@/features/messaging/hooks/use-thread';
export { useMessages } from '@/features/messaging/hooks/use-messages';
export { useSendMessage } from '@/features/messaging/hooks/use-send-message';
export { useCreateThread } from '@/features/messaging/hooks/use-create-thread';
export { useMarkRead } from '@/features/messaging/hooks/use-mark-read';
export { useUnreadCount } from '@/features/messaging/hooks/use-unread-count';
export { useOffer } from '@/features/messaging/hooks/use-offer';
export { useCreateOffer } from '@/features/messaging/hooks/use-create-offer';
export { useOfferActions } from '@/features/messaging/hooks/use-offer-actions';
