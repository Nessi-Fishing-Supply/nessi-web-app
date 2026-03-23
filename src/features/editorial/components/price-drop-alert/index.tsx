'use client';

import Image from 'next/image';
import { HiCurrencyDollar } from 'react-icons/hi';
import styles from './price-drop-alert.module.scss';

interface PriceDropAlertProps {
  variant: 'banner' | 'saved-row';
  itemName: string;
  oldPrice: number;
  newPrice: number;
  thumbnail?: string;
  className?: string;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function getDropPercent(oldPrice: number, newPrice: number): number {
  return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
}

export default function PriceDropAlert({
  variant,
  itemName,
  oldPrice,
  newPrice,
  thumbnail,
  className,
}: PriceDropAlertProps) {
  const dropPercent = getDropPercent(oldPrice, newPrice);

  if (variant === 'banner') {
    return (
      <div
        className={`${styles.banner}${className ? ` ${className}` : ''}`}
        role="status"
        aria-live="polite"
      >
        <HiCurrencyDollar className={styles.bannerIcon} aria-hidden="true" />
        <p className={styles.bannerText}>
          <span className={styles.bannerTitle}>Price dropped!</span>
          {' Was '}
          <span className={styles.oldPriceBanner}>{formatPrice(oldPrice)}</span>
          {' \u2192 now '}
          <span className={styles.newPriceBanner}>{formatPrice(newPrice)}</span>
          {' on '}
          <strong>{itemName}</strong>
        </p>
        <span className={styles.dropBadge}>-{dropPercent}%</span>
      </div>
    );
  }

  return (
    <div className={`${styles.savedRow}${className ? ` ${className}` : ''}`} role="status">
      {thumbnail && (
        <div className={styles.thumbnail}>
          <Image
            src={thumbnail}
            alt={itemName}
            width={48}
            height={48}
            sizes="48px"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}
      <div className={styles.savedInfo}>
        <p className={styles.savedName}>{itemName}</p>
        <div className={styles.savedPrices}>
          <span className={styles.newPrice}>{formatPrice(newPrice)}</span>
          <span className={styles.oldPrice}>{formatPrice(oldPrice)}</span>
        </div>
      </div>
      <span className={styles.dropPill}>-{dropPercent}%</span>
    </div>
  );
}
