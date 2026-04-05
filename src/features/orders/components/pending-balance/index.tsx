'use client';

import { formatPrice } from '@/features/shared/utils/format';
import { useSellerOrders } from '@/features/orders/hooks/use-seller-orders';

import styles from './pending-balance.module.scss';

export default function PendingBalance() {
  const { data: orders = [], isLoading } = useSellerOrders();

  const heldOrders = orders.filter((o) => o.escrow_status === 'held');
  const pendingTotal = heldOrders.reduce((sum, o) => sum + (o.amount_cents - o.nessi_fee_cents), 0);

  if (isLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <p className={styles.label}>Pending Escrow</p>
      <p className={styles.amount}>{formatPrice(pendingTotal)}</p>
      <p className={styles.detail}>
        {heldOrders.length === 0
          ? 'No pending funds'
          : `${heldOrders.length} order${heldOrders.length !== 1 ? 's' : ''} in escrow`}
      </p>
    </div>
  );
}
