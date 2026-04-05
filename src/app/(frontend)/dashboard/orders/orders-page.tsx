'use client';

import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { HiOutlineShoppingBag } from 'react-icons/hi';
import { useOrders } from '@/features/orders/hooks/use-orders';
import OrderCard from '@/features/orders/components/order-card';
import OrderCardSkeleton from '@/features/orders/components/order-card-skeleton';
import OrderDetailPanel from '@/features/orders/components/order-detail-panel';
import SlidePanel from '@/components/layout/slide-panel';
import styles from './orders-page.module.scss';

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: orders = [], isLoading, isError, refetch } = useOrders();

  const selectedOrderId = searchParams.get('orderId') ?? undefined;
  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const isOrderSelected = !!selectedOrderId;
  const isDetailLoading = isOrderSelected && isLoading;
  const isOrderNotFound = isOrderSelected && !isLoading && !selectedOrder;

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
        {isError ? (
          <div className={styles.errorState} role="alert">
            <p className={styles.errorText}>Something went wrong loading your orders.</p>
            <button type="button" className={styles.retryBtn} onClick={() => refetch()}>
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div role="status" aria-live="polite">
            <span className="sr-only">Loading your orders</span>
            <OrderCardSkeleton count={4} />
          </div>
        ) : orders.length === 0 ? (
          <div className={styles.empty}>
            <HiOutlineShoppingBag className={styles.emptyIcon} aria-hidden="true" />
            <h2 className={styles.emptyHeading}>No orders yet</h2>
            <p className={styles.emptyText}>
              When you purchase gear, your orders will appear here.
            </p>
            <Link href="/listings" className={styles.browseCta}>
              Browse listings
            </Link>
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
          isOpen={isOrderSelected && !isOrderNotFound}
          onClose={handleClose}
          ariaLabel="Order details"
        >
          {isDetailLoading ? (
            <div className={styles.detailLoading}>
              <p>Loading order details...</p>
            </div>
          ) : selectedOrder ? (
            <OrderDetailPanel order={selectedOrder} onClose={handleClose} />
          ) : null}
        </SlidePanel>
        {!isOrderSelected && (
          <div className={styles.placeholder}>
            <p>Select an order to view details</p>
          </div>
        )}
        {isOrderNotFound && (
          <div className={styles.notFound}>
            <p className={styles.notFoundText}>Order not found</p>
            <button type="button" className={styles.clearBtn} onClick={handleClose}>
              Clear selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
