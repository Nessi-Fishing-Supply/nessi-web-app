'use client';

import Link from 'next/link';
import Avatar from '@/components/controls/avatar';
import TypeBadge from '@/features/messaging/components/type-badge';
import OfferBubble from '@/features/messaging/components/offer-bubble';
import type { ThreadWithParticipants } from '@/features/messaging/types/thread';
import type { OfferWithDetails } from '@/features/messaging/types/offer';
import styles from './collapsible-header.module.scss';

interface CollapsibleHeaderProps {
  thread: ThreadWithParticipants;
  currentUserId: string;
  offer?: OfferWithDetails | null;
  onAcceptOffer?: () => void;
  onCounterOffer?: () => void;
  onDeclineOffer?: () => void;
  isOfferPending?: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function CollapsibleHeader({
  thread,
  currentUserId,
  offer,
  onAcceptOffer,
  onCounterOffer,
  onDeclineOffer,
  isOfferPending = false,
  isCollapsed,
  onToggle,
}: CollapsibleHeaderProps) {
  const otherParticipant = thread.participants.find((p) => p.member.id !== currentUserId);
  const otherName = otherParticipant
    ? `${otherParticipant.member.first_name} ${otherParticipant.member.last_name}`
    : 'Unknown';
  const otherAvatarUrl = otherParticipant?.member.avatar_url ?? undefined;
  const otherSlug = otherParticipant?.member.slug ?? null;

  const isSeller =
    otherParticipant?.role === 'buyer' ||
    thread.participants.find((p) => p.member.id === currentUserId)?.role === 'seller';

  return (
    <header className={styles.header} aria-expanded={!isCollapsed}>
      <button
        type="button"
        className={`${styles.toggle} ${isCollapsed ? styles.collapsed : styles.expanded}`}
        onClick={onToggle}
        aria-label={isCollapsed ? 'Expand thread details' : 'Collapse thread details'}
        aria-expanded={!isCollapsed}
      >
        <div className={styles.toggleInner}>
          <TypeBadge type={thread.type} />
          <span className={styles.toggleName}>{otherParticipant?.member.first_name ?? 'Unknown'}</span>
        </div>
        <span className={styles.chevron} aria-hidden="true">
          {isCollapsed ? '▾' : '▴'}
        </span>
      </button>

      <div className={`${styles.content} ${isCollapsed ? styles.contentCollapsed : ''}`} aria-hidden={isCollapsed}>
        {thread.type === 'inquiry' && (
          <div className={styles.section}>
            <div className={styles.participantRow}>
              <Avatar size="md" name={otherName} imageUrl={otherAvatarUrl} />
              <div className={styles.participantInfo}>
                {otherSlug ? (
                  <Link href={`/member/${otherSlug}`} className={styles.participantName}>
                    {otherName}
                  </Link>
                ) : (
                  <span className={styles.participantName}>{otherName}</span>
                )}
              </div>
            </div>
            {thread.listing_id && (
              <p className={styles.listingRef}>
                About:{' '}
                <Link href={`/listings/${thread.listing_id}`} className={styles.listingLink}>
                  Listing #{thread.listing_id.slice(0, 8)}
                </Link>
              </p>
            )}
          </div>
        )}

        {thread.type === 'offer' && offer && (
          <div className={styles.section}>
            <OfferBubble
              amount={offer.amount_cents}
              originalPrice={offer.listing?.price_cents ?? offer.amount_cents}
              expiresAt={new Date(offer.expires_at)}
              status={offer.status}
              onAccept={isSeller && offer.status === 'pending' ? onAcceptOffer : undefined}
              onCounter={isSeller && offer.status === 'pending' ? onCounterOffer : undefined}
              onDecline={isSeller && offer.status === 'pending' ? onDeclineOffer : undefined}
              isPending={isOfferPending}
              className={styles.offerBubble}
            />
          </div>
        )}

        {thread.type === 'direct' && (
          <div className={styles.section}>
            <div className={styles.participantRow}>
              <Avatar size="md" name={otherName} imageUrl={otherAvatarUrl} />
              <div className={styles.participantInfo}>
                {otherSlug ? (
                  <Link href={`/member/${otherSlug}`} className={styles.participantName}>
                    {otherName}
                  </Link>
                ) : (
                  <span className={styles.participantName}>{otherName}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {thread.type === 'custom_request' && (
          <div className={styles.section}>
            <div className={styles.participantRow}>
              <Avatar size="md" name={otherName} imageUrl={otherAvatarUrl} />
              <div className={styles.participantInfo}>
                {otherSlug ? (
                  <Link href={`/member/${otherSlug}`} className={styles.participantName}>
                    {otherName}
                  </Link>
                ) : (
                  <span className={styles.participantName}>{otherName}</span>
                )}
              </div>
            </div>
            <p className={styles.customRequestNote}>Custom gear request</p>
          </div>
        )}
      </div>
    </header>
  );
}
