'use client';

import { useId, useState } from 'react';

import Button from '@/components/controls/button';
import Modal from '@/components/layout/modal';
import type { ListingWithPhotos } from '@/features/listings/types/listing';
import { formatPrice } from '@/features/shared/utils/format';

import styles from './mark-sold-modal.module.scss';

interface MarkSoldModalProps {
  listing: ListingWithPhotos;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (soldPriceCents?: number) => void;
  loading?: boolean;
}

function displayToCents(display: string): number {
  const parsed = parseFloat(display);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export default function MarkSoldModal({
  listing,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}: MarkSoldModalProps) {
  const titleId = useId();
  const [priceDisplay, setPriceDisplay] = useState('');

  function handlePriceInput(value: string) {
    // Only allow digits and a single decimal point with up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setPriceDisplay(value);
    }
  }

  function handleConfirm() {
    const cents = displayToCents(priceDisplay);
    onConfirm(cents > 0 ? cents : undefined);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy={titleId}>
      <div className={styles.content}>
        <h3 id={titleId} className={styles.title}>
          Mark as Sold
        </h3>
        <p className={styles.listingTitle}>{listing.title}</p>
        <p id={`${titleId}-listed-price`} className={styles.listedPrice}>
          Listed at {formatPrice(listing.price_cents)}
        </p>

        <div className={styles.fieldGroup}>
          <label htmlFor="sold-price" className={styles.label}>
            What did it sell for? <span className={styles.optional}>(optional)</span>
          </label>
          <div className={styles.priceInputWrapper}>
            <span className={styles.currencyPrefix} aria-hidden="true">
              $
            </span>
            <input
              id="sold-price"
              type="text"
              inputMode="decimal"
              className={styles.priceInput}
              value={priceDisplay}
              onChange={(e) => handlePriceInput(e.target.value)}
              placeholder="0.00"
              autoComplete="off"
              aria-describedby={`${titleId}-listed-price`}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            style="primary"
            fullWidth
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            Mark as Sold
          </Button>
          <Button style="secondary" fullWidth outline onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
