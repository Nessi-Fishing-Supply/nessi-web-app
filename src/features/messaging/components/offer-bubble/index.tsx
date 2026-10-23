'use client';

import { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';
import type { OfferStatus } from '@/features/messaging/types/offer';
import styles from './offer-bubble.module.scss';

interface OfferBubbleProps {
  amount: number;
  originalPrice: number;
  expiresAt: Date;
  status: OfferStatus;
  onAccept?: () => void;
  onCounter?: () => void;
  onDecline?: () => void;
  isPending?: boolean;
  className?: string;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function getCountdown(expiresAt: Date): string {
  const diff = expiresAt.getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `Expires in ${hours}h ${minutes}m`;
  return `Expires in ${minutes}m`;
}

export default function OfferBubble({
  amount,
  originalPrice,
  expiresAt,
  status,
  onAccept,
  onCounter,
  onDecline,
  isPending = false,
  className,
}: OfferBubbleProps) {
  const [countdown, setCountdown] = useState(() => getCountdown(expiresAt));

  useEffect(() => {
    if (status !== 'pending') return;
    const interval = setInterval(() => {
      setCountdown(getCountdown(expiresAt));
    }, 60_000);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  const savingsCents = originalPrice - amount;
  const savingsPct = Math.round((savingsCents / originalPrice) * 100);

  return (
    <div className={`${styles.bubble}${className ? ` ${className}` : ''}`}>
      <span className={styles.label}>Offer</span>
      <p className={styles.amount}>{formatPrice(amount)}</p>
      <p className={styles.note}>
        {savingsCents > 0
          ? `${savingsPct}% off the listed price of ${formatPrice(originalPrice)}`
          : `Listed at ${formatPrice(originalPrice)}`}
      </p>
      {status === 'pending' && <p className={styles.expiry}>{countdown}</p>}
      {status === 'accepted' && (
        <p className={`${styles.statusBadge} ${styles.accepted}`}>Accepted</p>
      )}
      {status === 'declined' && (
        <p className={`${styles.statusBadge} ${styles.declined}`}>Declined</p>
      )}
      {status === 'countered' && (
        <p className={`${styles.statusBadge} ${styles.countered}`}>Countered</p>
      )}
      {status === 'expired' && <p className={`${styles.statusBadge} ${styles.expired}`}>Expired</p>}
      {status === 'pending' && (onAccept || onCounter || onDecline) && (
        <div className={styles.actions}>
          {onAccept && (
            <button
              type="button"
              className={styles.btnAccept}
              onClick={onAccept}
              aria-busy={isPending}
            >
              Accept
            </button>
          )}
          {onCounter && (
            <button
              type="button"
              className={styles.btnCounter}
              onClick={onCounter}
              aria-busy={isPending}
            >
              Counter
            </button>
          )}
          {onDecline && (
            <button
              type="button"
              className={styles.btnDecline}
              onClick={onDecline}
              aria-label="Decline offer"
              aria-busy={isPending}
            >
              <HiX aria-hidden="true" />
              Decline
            </button>
          )}
        </div>
      )}
    </div>
  );
}
