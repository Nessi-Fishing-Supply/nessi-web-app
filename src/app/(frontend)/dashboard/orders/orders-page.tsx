'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useOrders } from '@/features/orders/hooks/use-orders';
import OrderCard from '@/features/orders/components/order-card';
import OrderDetailPanel from '@/features/orders/components/order-detail-panel';
import SlidePanel from '@/components/layout/slide-panel';
import styles from './orders-page.module.scss';

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: orders = [], isLoading } = useOrders();

  const selectedOrderId = searchParams.get('orderId') ?? undefined;
  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  function handleSelectOrder(orderId: string) {
    router.push(`?orderId=${orderId}`, { scroll: false });
  }

  function handleClose() {
    router.push(pathname, { scroll: false });
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Your Orders</h1>

      <div className={styles.listColumn}>
        {isLoading ? (
          <p className={styles.loading}>Loading your orders...</p>
        ) : orders.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>You haven&apos;t placed any orders yet.</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isSelected={order.id === selectedOrderId}
              onSelect={() => handleSelectOrder(order.id)}
            />
          ))
        )}
      </div>

      <div className={styles.detailColumn}>
        <SlidePanel
          isOpen={!!selectedOrder}
          onClose={handleClose}
          ariaLabel="Order details"
        >
          {selectedOrder && (
            <OrderDetailPanel order={selectedOrder} onClose={handleClose} />
          )}
        </SlidePanel>
        {!selectedOrder && (
          <div className={styles.placeholder}>
            <p>Select an order to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
