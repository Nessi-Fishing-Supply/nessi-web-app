'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import Button from '@/components/controls/button';
import Modal from '@/components/layout/modal';
import { useToast } from '@/components/indicators/toast/context';
import { useUpdateListing } from '@/features/listings/hooks/use-listings';
import { calculateFee, calculateNet, formatPrice } from '@/features/shared/utils/format';
import type { ListingWithPhotos } from '@/features/listings/types/listing';

import styles from './quick-edit-price.module.scss';

interface QuickEditPriceProps {
  listing: ListingWithPhotos;
  isOpen: boolean;
  onClose: () => void;
}

function dollarsToDisplay(cents: number): string {
  if (cents === 0) return '';
  return (cents / 100).toFixed(2);
}

function displayToCents(display: string): number {
  const parsed = parseFloat(display);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export default function QuickEditPrice({ listing, isOpen, onClose }: QuickEditPriceProps) {
  const titleId = useId();
  const { showToast } = useToast();
  const updateListing = useUpdateListing();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [displayValue, setDisplayValue] = useState(() => dollarsToDisplay(listing.price_cents));
  const [feeCents, setFeeCents] = useState(listing.price_cents);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset and focus when modal opens — use a callback ref pattern
  const focusCallback = useCallback(
    (node: HTMLInputElement | null) => {
      if (node && isOpen) {
        requestAnimationFrame(() => node.focus());
      }
    },
    [isOpen],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDisplayValue(raw);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFeeCents(displayToCents(raw));
    }, 200);
  }

  function handleBlur() {
    const cents = displayToCents(displayValue);
    if (cents > 0) {
      setDisplayValue(dollarsToDisplay(cents));
    }
  }

  function handleSave() {
    const newCents = displayToCents(displayValue);
    if (newCents <= 0) return;
    if (newCents === listing.price_cents) {
      onClose();
      return;
    }

    updateListing.mutate(
      { id: listing.id, data: { price_cents: newCents } },
      {
        onSuccess: () => {
          onClose();
          showToast({
            type: 'success',
            message: 'Price updated',
            description: `New price: ${formatPrice(newCents)}`,
          });
        },
        onError: () => {
          showToast({
            type: 'error',
            message: 'Failed to update price',
            description: 'Please try again.',
          });
        },
      },
    );
  }

  const hasValidPrice = feeCents >= 100 && feeCents <= 999900;
  const nessiFeeCents = hasValidPrice ? calculateFee(feeCents) : 0;
  const netCents = hasValidPrice ? calculateNet(feeCents) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy={titleId}>
      <div className={styles.content}>
        <h3 id={titleId} className={styles.title}>
          Quick edit price
        </h3>

        <div className={styles.fieldGroup}>
          <label htmlFor="quick-price" className={styles.label}>
            Price
          </label>
          <div className={styles.priceInputWrapper}>
            <span className={styles.currencyPrefix} aria-hidden="true">
              $
            </span>
            <input
              ref={(node) => {
                inputRef.current = node;
                focusCallback(node);
              }}
              id="quick-price"
              type="text"
              inputMode="decimal"
              className={styles.priceInput}
              value={displayValue}
              onChange={handlePriceChange}
              onBlur={handleBlur}
              placeholder="0.00"
              autoComplete="off"
            />
          </div>
        </div>

        {hasValidPrice && (
          <div className={styles.feeCard} aria-live="polite" aria-atomic="true">
            <div className={styles.feeRow}>
              <span className={styles.feeLabel}>Nessi fee</span>
              <span className={styles.feeValue}>{formatPrice(nessiFeeCents)}</span>
            </div>
            <div className={`${styles.feeRow} ${styles.feeRowNet}`}>
              <span className={styles.feeLabel}>You&apos;ll receive</span>
              <span className={`${styles.feeValue} ${styles.feeValueNet}`}>
                {formatPrice(netCents)}
              </span>
            </div>
          </div>
        )}

        {listing.watcher_count > 0 && (
          <p className={styles.watcherNotice} role="status">
            {listing.watcher_count} {listing.watcher_count === 1 ? 'person is' : 'people are'}{' '}
            watching. Lowering your price will notify them.
          </p>
        )}

        <Button
          style="primary"
          fullWidth
          onClick={handleSave}
          loading={updateListing.isPending}
          disabled={updateListing.isPending || !hasValidPrice}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}
