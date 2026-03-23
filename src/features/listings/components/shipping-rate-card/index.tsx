'use client';

import { HiCheckCircle } from 'react-icons/hi';
import { formatPrice } from '@/features/shared/utils/format';
import styles from './shipping-rate-card.module.scss';

interface ShippingRateCardProps {
  carrier: string;
  service: string;
  price: number;
  eta: string;
  isSelected: boolean;
  isFree?: boolean;
  onSelect?: () => void;
  className?: string;
}

export default function ShippingRateCard({
  carrier,
  service,
  price,
  eta,
  isSelected,
  isFree = false,
  onSelect,
  className,
}: ShippingRateCardProps) {
  return (
    <button
      type="button"
      className={`${styles.card} ${isSelected ? styles.selected : styles.unselected} ${className ?? ''}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className={styles.left}>
        <span className={styles.carrier}>{carrier}</span>
        <span className={styles.service}>{service}</span>
        <span className={styles.eta}>{eta}</span>
      </div>
      <div className={styles.right}>
        <span className={`${styles.price} ${isFree ? styles.priceFree : ''}`}>
          {isFree ? 'Free' : formatPrice(price)}
        </span>
        {isSelected && <HiCheckCircle className={styles.checkIcon} aria-hidden="true" />}
      </div>
    </button>
  );
}
