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
