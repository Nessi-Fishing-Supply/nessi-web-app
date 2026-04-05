'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HiOutlineX } from 'react-icons/hi';
import OrderTimeline from '@/features/orders/components/order-timeline';
import OrderStatusBadge from '@/features/orders/components/order-status-badge';
import ConfirmationDialog from '@/components/layout/confirmation-dialog';
import { useAcceptOrder } from '@/features/orders/hooks/use-accept-order';
import { useToast } from '@/components/indicators/toast/context';
import { formatPrice } from '@/features/shared/utils/format';
import { getTimelineSteps } from '@/features/orders/utils/get-timeline-steps';
import { getTrackingUrl } from '@/features/orders/utils/get-tracking-url';
import type { OrderStatus, OrderWithListing } from '@/features/orders/types/order';
import styles from './order-detail-panel.module.scss';

interface OrderDetailPanelProps {
  order: OrderWithListing;
  onClose: () => void;
}

export default function OrderDetailPanel({ order, onClose }: OrderDetailPanelProps) {
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

  const status = order.status as OrderStatus;
  const { steps, currentStep } = getTimelineSteps(order);
  const canAccept = status === 'delivered' || status === 'verification';
  const totalCents = order.amount_cents + order.shipping_cost_cents;
  const trackingUrl =
    order.carrier && order.tracking_number
      ? getTrackingUrl(order.carrier, order.tracking_number)
      : null;

  const shippingAddress = order.shipping_address as {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  } | null;

  const sellerName = `${order.seller.first_name} ${order.seller.last_name}`;

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.heading}>Order Details</h2>
          <OrderStatusBadge status={status} />
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close order details"
        >
          <HiOutlineX aria-hidden="true" />
        </button>
      </div>

      {/* Listing info */}
      <div className={styles.listingCard}>
        <div className={styles.listingThumb}>
          {order.listing?.cover_photo_url ? (
            <Image
              src={order.listing.cover_photo_url}
              alt={order.listing.title ?? 'Order item'}
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
          <p className={styles.sellerName}>
            Sold by <span className={styles.sellerLabel}>{sellerName}</span>
          </p>
        </div>
      </div>

      {/* Price breakdown */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Price Breakdown</h3>
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

      {/* Order timeline */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Order Progress</h3>
        <OrderTimeline steps={steps} currentStep={currentStep} />
      </div>

      {/* Tracking info */}
      {order.tracking_number && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Tracking</h3>
          <p className={styles.trackingInfo}>
            {order.carrier && <span className={styles.carrier}>{order.carrier}</span>}
            {trackingUrl ? (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.trackingLink}
              >
                {order.tracking_number}
              </a>
            ) : (
              <span>{order.tracking_number}</span>
            )}
          </p>
        </div>
      )}

      {/* Shipping address */}
      {shippingAddress && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Shipping Address</h3>
          <address className={styles.shippingAddress}>
            <span>{shippingAddress.line1}</span>
            {shippingAddress.line2 && <span>{shippingAddress.line2}</span>}
            <span>
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
            </span>
            <span>{shippingAddress.country}</span>
          </address>
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

      {/* Accept delivery action */}
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
          <p className={styles.disputeNote}>
            Having an issue?{' '}
            <a href="mailto:support@nessifishingsupply.com" className={styles.disputeLink}>
              Contact support
            </a>
          </p>
        </div>
      )}

      <ConfirmationDialog
        isOpen={showAcceptDialog}
        onClose={() => setShowAcceptDialog(false)}
        onConfirm={() => acceptOrder.mutate(order.id)}
        title="Confirm delivery"
        message="This will release the funds to the seller. This action cannot be undone."
        confirmLabel="Confirm & release funds"
      />
    </div>
  );
}
