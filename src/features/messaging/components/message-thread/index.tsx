'use client';

import { useState, useCallback } from 'react';
import Avatar from '@/components/controls/avatar';
import MessageNode from '@/features/messaging/components/message-node';
import ListingNode from '@/features/messaging/components/message-node/listing-node';
import ImageNode from '@/features/messaging/components/message-node/image-node';
import ImageLightbox from '@/features/messaging/components/image-lightbox';
import OfferBubble from '@/features/messaging/components/offer-bubble';
import type { MessageWithSender } from '@/features/messaging/types/message';
import type { ImageAttachment } from '@/features/messaging/types/message';
import type { OfferStatus } from '@/features/messaging/types/offer';
import styles from './message-thread.module.scss';

export type { MessageWithSender };

interface MessageThreadProps {
  messages: MessageWithSender[];
  currentUserId: string;
  className?: string;
  otherParticipantLastReadAt?: string | null;
  onAcceptOffer?: () => void;
  onCounterOffer?: () => void;
  onDeclineOffer?: () => void;
  isOfferActionPending?: boolean;
  latestPendingOfferId?: string;
  currentUserRole?: string;
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDay.getTime() === today.getTime()) return 'Today';
  if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageThread({
  messages,
  currentUserId,
  className,
  otherParticipantLastReadAt,
  onAcceptOffer,
  onCounterOffer,
  onDeclineOffer,
  isOfferActionPending,
  latestPendingOfferId,
  currentUserRole,
}: MessageThreadProps) {
  const [lightboxImages, setLightboxImages] = useState<ImageAttachment[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleImageClick = useCallback((images: ImageAttachment[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleLightboxClose = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const lastSentMessageIndex = messages.reduce((last, m, i) => {
    return m.sender_id === currentUserId && (m.type === 'text' || m.type === 'image') ? i : last;
  }, -1);
  return (
    <div
      className={`${styles.thread}${className ? ` ${className}` : ''}`}
      role="log"
      aria-live="polite"
    >
      <ImageLightbox
        key={lightboxOpen ? `${lightboxImages[0]?.url}-${lightboxIndex}` : 'closed'}
        isOpen={lightboxOpen}
        onClose={handleLightboxClose}
        images={lightboxImages}
        initialIndex={lightboxIndex}
      />
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showSeparator =
          !prevMessage || !isSameDay(prevMessage.created_at, message.created_at);
        const separatorLabel = showSeparator ? formatDateSeparator(message.created_at) : null;

        if (message.type === 'system' || message.type === 'nudge') {
          return (
            <div key={message.id}>
              {showSeparator && (
                <div
                  className={styles.dateSeparator}
                  role="separator"
                  aria-label={separatorLabel ?? ''}
                >
                  <span>{separatorLabel}</span>
                </div>
              )}
              <div className={styles.nodeRow}>
                <MessageNode message={message} />
              </div>
            </div>
          );
        }

        if (message.type === 'listing_node') {
          return (
            <div key={message.id}>
              {showSeparator && (
                <div
                  className={styles.dateSeparator}
                  role="separator"
                  aria-label={separatorLabel ?? ''}
                >
                  <span>{separatorLabel}</span>
                </div>
              )}
              <div className={styles.nodeRow}>
                <ListingNode
                  metadata={
                    message.metadata as {
                      listing_id?: string;
                      title?: string;
                      price_cents?: number;
                      image_url?: string;
                      status?: string;
                    } | null
                  }
                />
              </div>
            </div>
          );
        }

        if (message.type === 'offer_node') {
          const meta = message.metadata as Record<string, unknown> | null;
          // Support both snake_case (new) and camelCase (legacy) metadata keys
          const amountCents =
            (meta?.amount_cents as number | undefined) ??
            (meta?.amountCents as number | undefined) ??
            0;
          const originalPriceCents = (meta?.original_price_cents as number | undefined) ?? 0;
          const status = (meta?.status as string | undefined) ?? 'expired';
          const expiresAt = meta?.expires_at as string | undefined;
          const isSent = message.sender_id === currentUserId;
          const senderName = `${message.sender.first_name} ${message.sender.last_name}`;

          return (
            <div key={message.id}>
              {showSeparator && (
                <div
                  className={styles.dateSeparator}
                  role="separator"
                  aria-label={separatorLabel ?? ''}
                >
                  <span>{separatorLabel}</span>
                </div>
              )}
              <div className={`${styles.row} ${isSent ? styles.sent : styles.received}`}>
                {!isSent && (
                  <div className={styles.avatarWrap} aria-hidden="true">
                    <Avatar
                      size="sm"
                      name={senderName}
                      imageUrl={message.sender.avatar_url ?? undefined}
                    />
                  </div>
                )}
                <div className={styles.bubbleGroup}>
                  <OfferBubble
                    amount={amountCents}
                    originalPrice={originalPriceCents}
                    expiresAt={expiresAt ? new Date(expiresAt) : new Date()}
                    status={(status as OfferStatus | undefined) ?? 'expired'}
                    {...(message.id === latestPendingOfferId &&
                    status === 'pending' &&
                    currentUserRole === 'seller'
                      ? {
                          onAccept: onAcceptOffer,
                          onCounter: onCounterOffer,
                          onDecline: onDeclineOffer,
                          isPending: isOfferActionPending,
                        }
                      : {})}
                  />
                  <time className={styles.timestamp} dateTime={message.created_at}>
                    {formatTime(message.created_at)}
                  </time>
                </div>
              </div>
            </div>
          );
        }

        if (message.type === 'custom_request_node') {
          return (
            <div key={message.id}>
              {showSeparator && (
                <div
                  className={styles.dateSeparator}
                  role="separator"
                  aria-label={separatorLabel ?? ''}
                >
                  <span>{separatorLabel}</span>
                </div>
              )}
              <div className={styles.nodeRow}>
                <p className={styles.customRequest}>Custom request</p>
              </div>
            </div>
          );
        }

        if (message.type === 'image') {
          const meta = message.metadata as { images?: ImageAttachment[] } | null;
          const images = meta?.images ?? [];
          const isSent = message.sender_id === currentUserId;
          const senderName = `${message.sender.first_name} ${message.sender.last_name}`;

          return (
            <div key={message.id}>
              {showSeparator && (
                <div
                  className={styles.dateSeparator}
                  role="separator"
                  aria-label={separatorLabel ?? ''}
                >
                  <span>{separatorLabel}</span>
                </div>
              )}
              <div className={`${styles.row} ${isSent ? styles.sent : styles.received}`}>
                {!isSent && (
                  <div className={styles.avatarWrap} aria-hidden="true">
                    <Avatar
                      size="sm"
                      name={senderName}
                      imageUrl={message.sender.avatar_url ?? undefined}
                    />
                  </div>
                )}
                <div className={styles.bubbleGroup}>
                  <ImageNode
                    images={images}
                    onImageClick={(imgIndex) => handleImageClick(images, imgIndex)}
                  />
                  <time className={styles.timestamp} dateTime={message.created_at}>
                    {formatTime(message.created_at)}
                  </time>
                  {isSent &&
                    index === lastSentMessageIndex &&
                    otherParticipantLastReadAt &&
                    new Date(otherParticipantLastReadAt) > new Date(message.created_at) && (
                      <span className={styles.readReceipt}>Read</span>
                    )}
                </div>
              </div>
            </div>
          );
        }

        // text (default)
        const isSent = message.sender_id === currentUserId;
        const senderName = `${message.sender.first_name} ${message.sender.last_name}`;

        return (
          <div key={message.id}>
            {showSeparator && (
              <div
                className={styles.dateSeparator}
                role="separator"
                aria-label={separatorLabel ?? ''}
              >
                <span>{separatorLabel}</span>
              </div>
            )}
            <div className={`${styles.row} ${isSent ? styles.sent : styles.received}`}>
              {!isSent && (
                <div className={styles.avatarWrap} aria-hidden="true">
                  <Avatar
                    size="sm"
                    name={senderName}
                    imageUrl={message.sender.avatar_url ?? undefined}
                  />
                </div>
              )}
              <div className={styles.bubbleGroup}>
                <div
                  className={`${styles.bubble} ${isSent ? styles.bubbleSent : styles.bubbleReceived}`}
                  aria-label={`${message.sender.first_name}: ${message.content}`}
                >
                  {message.content}
                </div>
                <time className={styles.timestamp} dateTime={message.created_at}>
                  {formatTime(message.created_at)}
                </time>
                {isSent &&
                  index === lastSentMessageIndex &&
                  otherParticipantLastReadAt &&
                  new Date(otherParticipantLastReadAt) > new Date(message.created_at) && (
                    <span className={styles.readReceipt}>Read</span>
                  )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
