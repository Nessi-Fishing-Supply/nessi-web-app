'use client';

import { useCallback, useEffect, useState } from 'react';
import { HiExclamationCircle, HiCheckCircle } from 'react-icons/hi';
import Button from '@/components/controls/button';
import styles from './offer-ui.module.scss';

interface OfferUiProps {
  amount: number;
  originalPrice: number;
  expiresAt: Date;
  status: 'pending' | 'floor-warning' | 'accepted';
  floorAmount?: number;
  onAccept?: () => void;
  onCounter?: () => void;
  onDecline?: () => void;
  onCheckout?: () => void;
  className?: string;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function useCountdown(expiresAt: Date): string {
  const getRemaining = useCallback(() => {
    const diff = expiresAt.getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }, [expiresAt]);

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining()), 1000);
    return () => clearInterval(id);
  }, [expiresAt, getRemaining]);

  return remaining;
}

export default function OfferUi({
  amount,
  originalPrice,
  expiresAt,
  status,
  floorAmount,
  onAccept,
  onCounter,
  onDecline,
  onCheckout,
  className,
}: OfferUiProps) {
  const countdown = useCountdown(expiresAt);

  if (status === 'accepted') {
    return (
      <div className={`${styles.card} ${styles.accepted} ${className ?? ''}`}>
        <div className={styles.acceptedHeader}>
          <HiCheckCircle className={styles.acceptedIcon} aria-hidden="true" />
          <span className={styles.acceptedTitle}>
            Offer Accepted &mdash; {formatCurrency(amount)}
          </span>
        </div>
        <p className={styles.acceptedSub}>Proceed to checkout to complete your purchase.</p>
        {onCheckout && (
          <div className={styles.actions}>
            <Button onClick={onCheckout} style="primary" fullWidth>
              Checkout Now
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (status === 'floor-warning') {
    return (
      <div className={`${styles.card} ${styles.floorWarning} ${className ?? ''}`}>
        <div className={styles.warningHeader}>
          <HiExclamationCircle className={styles.warningIcon} aria-hidden="true" />
          <span className={styles.warningText}>
            Minimum offer is {floorAmount !== undefined ? formatCurrency(floorAmount) : '—'} (70% of
            asking)
          </span>
        </div>
        <div className={styles.amountRow}>
          <span className={`${styles.amount} ${styles.amountError}`}>{formatCurrency(amount)}</span>
          <span className={styles.originalPrice}>{formatCurrency(originalPrice)}</span>
        </div>
        <p className={styles.expiry}>
          <span className={styles.expiryLabel}>Expires in</span> {countdown}
        </p>
        <div className={styles.actions}>
          {onDecline && (
            <Button onClick={onDecline} style="light" outline>
              Decline
            </Button>
          )}
          {onCounter && (
            <Button onClick={onCounter} style="secondary" outline>
              Counter
            </Button>
          )}
          {onAccept && (
            <Button onClick={onAccept} style="primary">
              Accept
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles.pending} ${className ?? ''}`}>
      <div className={styles.amountRow}>
        <span className={styles.amount}>{formatCurrency(amount)}</span>
        <span className={styles.originalPrice}>{formatCurrency(originalPrice)}</span>
      </div>
      <p className={styles.expiry}>
        <span className={styles.expiryLabel}>Expires in</span> {countdown}
      </p>
      <div className={styles.actions}>
        {onDecline && (
          <Button onClick={onDecline} style="light" outline>
            Decline
          </Button>
        )}
        {onCounter && (
          <Button onClick={onCounter} style="secondary" outline>
            Counter
          </Button>
        )}
        {onAccept && (
          <Button onClick={onAccept} style="primary">
            Accept
          </Button>
        )}
      </div>
    </div>
  );
}
