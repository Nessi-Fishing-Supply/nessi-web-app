'use client';

import Image from 'next/image';
import Link from 'next/link';

import Pill from '@/components/indicators/pill';
import { formatPrice } from '@/features/shared/utils/format';
import { STATUS_LABELS, STATUS_PILL_MAP } from '@/features/orders/types/order';
import type { OrderStatus, OrderWithListing } from '@/features/orders/types/order';

import styles from './order-card.module.scss';

interface OrderCardProps {
  order: OrderWithListing;
  href: string;
}

export default function OrderCard({ order, href }: OrderCardProps) {
  const status = order.status as OrderStatus;
  const date = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link href={href} className={styles.card}>
      <div className={styles.thumbnail}>
        {order.listing?.cover_photo_url ? (
          <Image
            src={order.listing.cover_photo_url}
            alt={order.listing?.title ?? 'Order item'}
            fill
            sizes="80px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true" />
        )}
      </div>
      <div className={styles.details}>
        <p className={styles.title}>{order.listing?.title ?? 'Item'}</p>
        <p className={styles.meta}>
          <span>{date}</span>
          <span className={styles.dot}>·</span>
          <span>{formatPrice(order.amount_cents)}</span>
        </p>
      </div>
      <div className={styles.status}>
        <Pill color={STATUS_PILL_MAP[status] ?? 'default'}>{STATUS_LABELS[status] ?? status}</Pill>
      </div>
    </Link>
  );
}
