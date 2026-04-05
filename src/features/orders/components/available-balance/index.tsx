'use client';

import { formatPrice } from '@/features/shared/utils/format';
import { useSellerBalance } from '@/features/orders/hooks/use-seller-balance';

import styles from './available-balance.module.scss';

export default function AvailableBalance() {
  const { data, isLoading, isError } = useSellerBalance();

  if (isLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.card}>
        <p className={styles.error}>Unable to load balance</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div>
          <p className={styles.label}>Available for Payout</p>
          <p className={styles.amount}>{formatPrice(data?.available ?? 0)}</p>
        </div>
        <div>
          <p className={styles.label}>Processing</p>
          <p className={styles.amountSecondary}>{formatPrice(data?.pending ?? 0)}</p>
        </div>
      </div>
    </div>
  );
}
