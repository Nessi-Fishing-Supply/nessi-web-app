'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Avatar from '@/components/controls/avatar';
import Pill from '@/components/indicators/pill';
import TypeBadge from '@/features/messaging/components/type-badge';
import OfferBubble from '@/features/messaging/components/offer-bubble';
import type { ThreadWithParticipants } from '@/features/messaging/types/thread';
import type { OfferWithDetails, OfferStatus } from '@/features/messaging/types/offer';
import styles from './collapsible-header.module.scss';

const OFFER_STATUS_PILL_COLOR: Record<OfferStatus, 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  accepted: 'success',
  declined: 'error',
  countered: 'warning',
  expired: 'default',
};

function getCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `Expires in ${hours}h ${minutes}m`;
  return `Expires in ${minutes}m`;
}

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

  const [countdown, setCountdown] = useState(() =>
    offer?.status === 'pending' ? getCountdown(offer.expires_at) : '',
  );

  useEffect(() => {
    if (offer?.status !== 'pending') return;
    setCountdown(getCountdown(offer.expires_at));
    const interval = setInterval(() => {
      setCountdown(getCountdown(offer.expires_at));
    }, 60_000);
    return () => clearInterval(interval);
  }, [offer?.status, offer?.expires_at]);

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
          {offer && (
            <Pill color={OFFER_STATUS_PILL_COLOR[offer.status]}>
              {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
            </Pill>
          )}
          <span className={styles.toggleName}>
            {otherParticipant?.member.first_name ?? 'Unknown'}
          </span>
        </div>
        <span className={styles.chevron} aria-hidden="true">
          {isCollapsed ? '▾' : '▴'}
        </span>
      </button>

      <div
        className={`${styles.content} ${isCollapsed ? styles.contentCollapsed : ''}`}
        aria-hidden={isCollapsed}
      >
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
            {/* TODO: Enhance to show listing title/thumbnail when ThreadWithParticipants carries listing details */}
            {thread.listing_id && (
              <p className={styles.listingRef}>
                About:{' '}
                <Link href={`/listing/${thread.listing_id}`} className={styles.listingLink}>
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
            {offer.status === 'pending' && countdown && (
              <p className={styles.countdown}>{countdown}</p>
            )}
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
