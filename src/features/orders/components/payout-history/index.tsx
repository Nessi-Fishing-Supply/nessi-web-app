'use client';

import Link from 'next/link';
import { formatPrice } from '@/features/shared/utils/format';
import { usePayoutHistory } from '@/features/orders/hooks/use-payout-history';
import styles from './payout-history.module.scss';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PayoutHistory() {
  const { data, isLoading } = usePayoutHistory();
  const transfers = data?.transfers ?? [];

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Payout History</h2>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (transfers.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Payout History</h2>
        <p className={styles.empty}>No payouts yet</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Payout History</h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <caption className="sr-only">
            Payout history showing date, order, amount, fee, and net received
          </caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Order</th>
              <th scope="col" className={styles.alignRight}>
                Amount
              </th>
              <th scope="col" className={styles.alignRight}>
                Fee
              </th>
              <th scope="col" className={styles.alignRight}>
                Net Received
              </th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id}>
                <td>{formatDate(t.createdAt)}</td>
                <td>
                  {t.orderId ? (
                    <Link
                      href={`/dashboard/orders/${t.orderId}`}
                      className={styles.orderLink}
                    >
                      View order
                    </Link>
                  ) : (
                    <span className={styles.noOrder}>—</span>
                  )}
                </td>
                <td className={styles.alignRight}>{formatPrice(t.amount)}</td>
                <td className={`${styles.alignRight} ${styles.feeCell}`}>
                  {t.nessiFeeCents > 0 ? `-${formatPrice(t.nessiFeeCents)}` : '—'}
                </td>
                <td className={`${styles.alignRight} ${styles.netCell}`}>
                  {formatPrice(t.netAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
