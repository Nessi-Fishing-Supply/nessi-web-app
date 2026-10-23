'use client';

import Button from '@/components/controls/button';
import { formatPrice } from '@/features/shared/utils/format';

import styles from './cart-summary.module.scss';

interface CartSummaryProps {
  itemCount: number;
  subtotalCents: number;
  onClearCart: () => void;
  isClearing?: boolean;
}

export default function CartSummary({
  itemCount,
  subtotalCents,
  onClearCart,
  isClearing = false,
}: CartSummaryProps) {
  return (
    <div className={styles.summary}>
      <h2 className={styles.heading}>Order Summary</h2>

      <div className={styles.lineItems}>
        <div className={styles.lineRow}>
          <span className={styles.lineLabel}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className={styles.lineRow}>
          <span className={styles.lineLabel}>Subtotal</span>
          <span className={styles.lineValue}>{formatPrice(subtotalCents)}</span>
        </div>

        <div className={styles.lineRow}>
          <span className={styles.lineLabel}>Shipping</span>
          <span className={styles.lineValueMuted}>Calculated at checkout</span>
        </div>
      </div>

      <p className={styles.disclaimer}>
        Items in your cart are not reserved and may sell before checkout.
      </p>

      <div className={styles.actions}>
        <Button style="primary" fullWidth disabled aria-disabled="true">
          Proceed to Checkout
        </Button>

        <button
          type="button"
          className={styles.clearButton}
          onClick={onClearCart}
          disabled={isClearing}
        >
          {isClearing ? 'Clearing…' : 'Clear Cart'}
        </button>
      </div>
    </div>
  );
}
