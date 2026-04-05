'use client';

import Image from 'next/image';

import { formatPrice } from '@/features/shared/utils/format';
import OrderStatusBadge from '@/features/orders/components/order-status-badge';
import { STATUS_LABELS } from '@/features/orders/types/order';
import type { OrderStatus, OrderWithListing } from '@/features/orders/types/order';

import styles from './order-card.module.scss';

interface OrderCardProps {
  order: OrderWithListing;
  isSelected?: boolean;
  onSelect?: () => void;
}

export default function OrderCard({ order, isSelected = false, onSelect }: OrderCardProps) {
  const status = order.status as OrderStatus;
  const title = order.listing?.title ?? 'Item';
  const price = formatPrice(order.amount_cents);
  const statusLabel = STATUS_LABELS[status] ?? status;
  const sellerName = `${order.seller.first_name} ${order.seller.last_name}`;
  const date = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article
      role="button"
      tabIndex={0}
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      aria-pressed={isSelected}
      aria-label={`Order: ${title}, ${statusLabel}, ${price}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      <div className={styles.thumbnail}>
        {order.listing?.cover_photo_url ? (
          <Image
            src={order.listing.cover_photo_url}
            alt={title}
            fill
            sizes="80px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true" />
        )}
      </div>
      <div className={styles.details}>
        <p className={styles.title}>{title}</p>
        <p className={styles.seller}>{sellerName}</p>
        <p className={styles.meta}>
          <span>{date}</span>
          <span className={styles.dot}>·</span>
          <span>{price}</span>
        </p>
      </div>
      <div className={styles.status}>
        <OrderStatusBadge status={status} />
      </div>
    </article>
  );
}
