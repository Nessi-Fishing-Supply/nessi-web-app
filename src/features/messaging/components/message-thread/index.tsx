'use client';

import Avatar from '@/components/controls/avatar';
import MessageNode from '@/features/messaging/components/message-node';
import ListingNode from '@/features/messaging/components/message-node/listing-node';
import OfferBubble from '@/features/messaging/components/offer-bubble';
import type { MessageWithSender } from '@/features/messaging/types/message';
import type { OfferStatus } from '@/features/messaging/types/offer';
import styles from './message-thread.module.scss';

export type { MessageWithSender };

interface MessageThreadProps {
  messages: MessageWithSender[];
  currentUserId: string;
  className?: string;
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

export default function MessageThread({ messages, currentUserId, className }: MessageThreadProps) {
  return (
    <div
      className={`${styles.thread}${className ? ` ${className}` : ''}`}
      role="log"
      aria-live="polite"
    >
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
          const meta = message.metadata as {
            offer_id?: string;
            amount_cents?: number;
            original_price_cents?: number;
            status?: string;
            expires_at?: string;
          } | null;

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
                <OfferBubble
                  amount={meta?.amount_cents ?? 0}
                  originalPrice={meta?.original_price_cents ?? 0}
                  expiresAt={meta?.expires_at ? new Date(meta.expires_at) : new Date()}
                  status={(meta?.status as OfferStatus | undefined) ?? 'expired'}
                />
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
