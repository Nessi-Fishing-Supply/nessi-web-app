'use client';

import { useOrders } from '@/features/orders/hooks/use-orders';
import OrderCard from '@/features/orders/components/order-card';
import styles from './orders-page.module.scss';

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useOrders();

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>My Orders</h1>

      {isLoading ? (
        <p className={styles.loading}>Loading your orders...</p>
      ) : orders.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>You haven&apos;t placed any orders yet.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} href={`/dashboard/orders/${order.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
