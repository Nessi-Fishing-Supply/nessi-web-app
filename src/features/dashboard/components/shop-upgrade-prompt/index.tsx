'use client';

import { HiCheck } from 'react-icons/hi';
import styles from './shop-upgrade-prompt.module.scss';

interface ShopUpgradePromptProps {
  listingCount: number;
  totalSales: number;
  onUpgrade: () => void;
  onDismiss: () => void;
  className?: string;
}

const benefits = [
  'Custom shop page with your branding',
  'Bulk listing tools and price editor',
  'Shop analytics and performance insights',
  'Priority search placement',
];

export default function ShopUpgradePrompt({
  listingCount,
  totalSales,
  onUpgrade,
  onDismiss,
  className,
}: ShopUpgradePromptProps) {
  return (
    <div className={`${styles.prompt}${className ? ` ${className}` : ''}`}>
      <span className={styles.pill}>Upgrade Available</span>
      <h2 className={styles.headline}>Open Your Shop</h2>
      <p className={styles.subtext}>
        You have {listingCount} listing{listingCount !== 1 ? 's' : ''} and {totalSales} sale
        {totalSales !== 1 ? 's' : ''}. Take your selling to the next level.
      </p>
      <ul className={styles.benefits} aria-label="Shop benefits">
        {benefits.map((benefit) => (
          <li key={benefit} className={styles.benefitItem}>
            <HiCheck className={styles.benefitIcon} aria-hidden="true" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <button type="button" className={styles.btnUpgrade} onClick={onUpgrade}>
          Open My Shop
        </button>
        <button type="button" className={styles.btnDismiss} onClick={onDismiss}>
          Later
        </button>
      </div>
    </div>
  );
}
