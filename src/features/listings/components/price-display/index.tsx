'use client';

import { HiHeart } from 'react-icons/hi';
import { formatPrice } from '@/features/shared/utils/format';
import styles from './price-display.module.scss';

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  watcherCount?: number;
  belowAvgLabel?: string;
  variant?: 'standard' | 'below-avg' | 'price-drop';
  className?: string;
}

export default function PriceDisplay({
  price,
  originalPrice,
  watcherCount,
  belowAvgLabel = 'below avg resale',
  variant = 'standard',
  className,
}: PriceDisplayProps) {
  const dropPercent =
    variant === 'price-drop' && originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <div className={styles.priceRow}>
        {variant === 'price-drop' && originalPrice && (
          <span className={styles.originalPrice}>{formatPrice(originalPrice)}</span>
        )}
        <span
          className={`${styles.price} ${variant === 'price-drop' ? styles.priceDrop : ''}`}
        >
          {formatPrice(price)}
        </span>
        {variant === 'price-drop' && dropPercent !== null && (
          <span className={styles.dropBadge} aria-label={`${dropPercent}% price drop`}>
            -{dropPercent}%
          </span>
        )}
        {variant === 'standard' && (
          <span className={styles.orOffer}>or offer</span>
        )}
      </div>

      {variant === 'below-avg' && (
        <span className={styles.belowAvg} aria-label={belowAvgLabel}>
          {belowAvgLabel}
        </span>
      )}

      {watcherCount !== undefined && watcherCount > 0 && (
        <span className={styles.watchers}>
          <HiHeart className={styles.watcherIcon} aria-hidden="true" />
          {watcherCount} {watcherCount === 1 ? 'watcher' : 'watchers'}
        </span>
      )}
    </div>
  );
}
