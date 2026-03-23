'use client';

import { HiInformationCircle } from 'react-icons/hi';
import { formatPrice } from '@/features/shared/utils/format';
import styles from './fee-calculator.module.scss';

interface FeeCalculatorProps {
  price: number;
  feeRate: number;
  isShop?: boolean;
  className?: string;
}

export default function FeeCalculator({
  price,
  feeRate,
  isShop = false,
  className,
}: FeeCalculatorProps) {
  const feeCents = Math.round(price * feeRate);
  const netCents = price - feeCents;

  return (
    <div className={`${styles.card} ${className ?? ''}`}>
      <div className={styles.row}>
        <span className={styles.label}>Listing price</span>
        <span className={styles.value}>{formatPrice(price)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>
          Nessi fee
          <span className={styles.rateHint}>({(feeRate * 100).toFixed(0)}%)</span>
        </span>
        <span className={styles.value}>−{formatPrice(feeCents)}</span>
      </div>
      <div className={styles.divider} role="separator" />
      <div className={`${styles.row} ${styles.rowNet}`}>
        <span className={styles.labelNet}>You receive</span>
        <span className={styles.valueNet}>{formatPrice(netCents)}</span>
      </div>
      {isShop && (
        <div className={styles.shopBanner} role="note">
          <HiInformationCircle className={styles.bannerIcon} aria-hidden="true" />
          <span>Shops receive a reduced fee rate on all sales.</span>
        </div>
      )}
    </div>
  );
}
