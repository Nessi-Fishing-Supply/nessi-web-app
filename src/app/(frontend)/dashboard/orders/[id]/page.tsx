'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useOrder } from '@/features/orders/hooks/use-order';
import { useAcceptOrder } from '@/features/orders/hooks/use-accept-order';
import OrderTimeline from '@/features/orders/components/order-timeline';
import ConfirmationDialog from '@/components/layout/confirmation-dialog';
import Pill from '@/components/indicators/pill';
import { formatPrice } from '@/features/shared/utils/format';
import { getTimelineSteps } from '@/features/orders/utils/get-timeline-steps';
import { STATUS_PILL_MAP, STATUS_LABELS } from '@/features/orders/types/order';
import type { OrderStatus } from '@/features/orders/types/order';
import { useToast } from '@/components/indicators/toast/context';
import styles from './order-detail.module.scss';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, isLoading } = useOrder(id);
  const { showToast } = useToast();
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const acceptOrder = useAcceptOrder({
    onSuccess: () => {
      setShowAcceptDialog(false);
      showToast({
        type: 'success',
        message: 'Delivery confirmed',
        description: 'Funds have been released to the seller.',
      });
    },
    onError: () => {
      showToast({
        type: 'error',
        message: 'Failed to confirm delivery',
        description: 'Please try again.',
      });
    },
  });

  if (isLoading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Order not found.</p>
      </div>
    );
  }

  const status = order.status as OrderStatus;
  const { steps, currentStep } = getTimelineSteps(order);
  const canAccept = status === 'delivered' || status === 'verification';
  const totalCents = order.amount_cents + order.shipping_cost_cents;

  return (
    <div className={styles.page}>
      <Link href="/dashboard/orders" className={styles.backLink}>
        ← Back to orders
      </Link>

      <div className={styles.header}>
        <h1 className={styles.heading}>Order Details</h1>
        <Pill color={STATUS_PILL_MAP[status] ?? 'default'}>{STATUS_LABELS[status] ?? status}</Pill>
      </div>

      {/* Listing info */}
      <div className={styles.listingCard}>
        <div className={styles.listingThumb}>
          {order.listing?.cover_photo_url ? (
            <Image
              src={order.listing.cover_photo_url}
              alt={order.listing?.title ?? 'Order item'}
              fill
              sizes="(max-width: 480px) 80px, 100px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className={styles.placeholder} aria-hidden="true" />
          )}
        </div>
        <div className={styles.listingInfo}>
          <p className={styles.listingTitle}>{order.listing?.title ?? 'Item'}</p>
        </div>
      </div>

      {/* Price breakdown */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Price Breakdown</h2>
        <dl className={styles.priceList}>
          <div className={styles.priceRow}>
            <dt>Item price</dt>
            <dd>{formatPrice(order.amount_cents)}</dd>
          </div>
          {order.shipping_cost_cents > 0 && (
            <div className={styles.priceRow}>
              <dt>Shipping</dt>
              <dd>{formatPrice(order.shipping_cost_cents)}</dd>
            </div>
          )}
          <div className={`${styles.priceRow} ${styles.priceTotal}`}>
            <dt>Total</dt>
            <dd>{formatPrice(totalCents)}</dd>
          </div>
        </dl>
      </div>

      {/* Tracking info */}
      {order.tracking_number && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Tracking</h2>
          <p className={styles.trackingInfo}>
            <span className={styles.carrier}>{order.carrier}</span>
            <span>{order.tracking_number}</span>
          </p>
        </div>
      )}

      {/* Status timeline */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Order Progress</h2>
        <OrderTimeline steps={steps} currentStep={currentStep} />
      </div>

      {/* Accept delivery button */}
      {canAccept && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.acceptBtn}
            onClick={() => setShowAcceptDialog(true)}
            aria-busy={acceptOrder.isPending}
            disabled={acceptOrder.isPending}
          >
            {acceptOrder.isPending ? 'Processing...' : 'Item arrived as described'}
          </button>
          <Link href="#" className={styles.disputeLink}>
            Open a dispute
          </Link>
        </div>
      )}

      {/* Verification deadline notice */}
      {status === 'verification' && order.verification_deadline && (
        <p className={styles.verificationNotice}>
          You have until{' '}
          {new Date(order.verification_deadline).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}{' '}
          to verify your order.
        </p>
      )}

      <ConfirmationDialog
        isOpen={showAcceptDialog}
        onClose={() => setShowAcceptDialog(false)}
        onConfirm={() => acceptOrder.mutate(id)}
        title="Confirm delivery"
        message="This will release the funds to the seller. This action cannot be undone."
        confirmLabel="Confirm & release funds"
      />
    </div>
  );
}
