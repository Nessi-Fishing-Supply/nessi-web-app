'use client';

import { useState, useId, useCallback } from 'react';
import Modal from '@/components/layout/modal';
import { useToast } from '@/components/indicators/toast/context';
import { useCreateOffer } from '@/features/messaging/hooks/use-create-offer';
import { useOfferActions } from '@/features/messaging/hooks/use-offer-actions';
import {
  validateOfferAmount,
  calculateDefaultOffer,
  calculateMinOffer,
} from '@/features/messaging/utils/offer-validation';
import { formatPrice } from '@/features/shared/utils/format';
import styles from './offer-sheet.module.scss';

interface OfferSheetProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  listingPriceCents: number;
  sellerId: string;
  mode: 'create' | 'counter';
  currentOfferAmountCents?: number;
  offerId?: string;
  onOfferCreated?: (offer: { thread_id: string }) => void;
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function dollarsToCents(dollars: string): number {
  const parsed = parseFloat(dollars);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export default function OfferSheet({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  listingPriceCents,
  sellerId,
  mode,
  currentOfferAmountCents,
  offerId,
  onOfferCreated,
}: OfferSheetProps) {
  const errorId = useId();
  const { showToast } = useToast();

  const defaultCents =
    mode === 'counter' && currentOfferAmountCents
      ? currentOfferAmountCents
      : calculateDefaultOffer(listingPriceCents);

  const [inputValue, setInputValue] = useState(() => centsToDollars(defaultCents));
  const [error, setError] = useState<string | null>(null);

  const amountCents = dollarsToCents(inputValue);
  const minCents = calculateMinOffer(listingPriceCents);

  const createOffer = useCreateOffer({
    onSuccess: (offer) => {
      showToast({
        message: 'Offer sent!',
        description: 'Your offer has been submitted to the seller.',
        type: 'success',
      });
      onClose();
      onOfferCreated?.({ thread_id: offer.thread_id });
    },
    onError: () => {
      showToast({
        message: 'Failed to send offer',
        description: 'Something went wrong. Please try again.',
        type: 'error',
      });
    },
  });

  const offerActions = useOfferActions({
    offerId: offerId ?? '',
    onSuccess: () => {
      showToast({
        message: 'Counter sent!',
        description: 'Your counter offer has been submitted.',
        type: 'success',
      });
      onClose();
    },
    onError: () => {
      showToast({
        message: 'Failed to send counter',
        description: 'Something went wrong. Please try again.',
        type: 'error',
      });
    },
  });

  const isPending = createOffer.isPending || offerActions.counter.isPending;

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Allow only numeric and single decimal point
      if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val)) return;
      setInputValue(val);

      const cents = dollarsToCents(val);
      const result = validateOfferAmount(cents, listingPriceCents);
      setError(result.valid ? null : `Minimum offer is ${formatPrice(minCents)}`);
    },
    [listingPriceCents, minCents],
  );

  const handleBlur = useCallback(() => {
    if (inputValue === '') return;
    const cents = dollarsToCents(inputValue);
    setInputValue(centsToDollars(cents));
  }, [inputValue]);

  const handleSubmit = useCallback(() => {
    const result = validateOfferAmount(amountCents, listingPriceCents);
    if (!result.valid) {
      setError(`Minimum offer is ${formatPrice(minCents)}`);
      return;
    }

    if (mode === 'create') {
      createOffer.mutate({ listingId, sellerId, amountCents });
    } else if (offerId) {
      offerActions.counter.mutate({ amountCents });
    }
  }, [
    amountCents,
    listingPriceCents,
    minCents,
    mode,
    createOffer,
    offerActions.counter,
    listingId,
    sellerId,
    offerId,
  ]);

  const isValid = amountCents > 0 && !error;
  const buyerFee = 0; // placeholder
  const totalCents = amountCents + buyerFee;

  const titleId = `${errorId}-title`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy={titleId}>
      <h2 id={titleId} className={styles.modalTitle}>
        {mode === 'create' ? 'Make an Offer' : 'Counter Offer'}
      </h2>

      <div className={styles.listingContext}>
        <div>
          <p className={styles.listingTitle}>{listingTitle}</p>
          <p className={styles.listingPrice}>Listed at {formatPrice(listingPriceCents)}</p>
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel} htmlFor="offer-amount">
          Your offer
        </label>
        <div className={styles.inputWrapper}>
          <span className={styles.currencySymbol} aria-hidden="true">
            $
          </span>
          <input
            id="offer-amount"
            type="text"
            className={`${styles.priceInput}${error ? ` ${styles.priceInputError}` : ''}`}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            disabled={isPending}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        {error && (
          <p id={errorId} className={styles.errorMessage} role="alert">
            {error}
          </p>
        )}
      </div>

      <div className={styles.feeBreakdown}>
        <div className={styles.feeRow}>
          <span>Offer amount</span>
          <span>{formatPrice(amountCents)}</span>
        </div>
        <div className={styles.feeRow}>
          <span>Buyer fee</span>
          <span>{formatPrice(buyerFee)}</span>
        </div>
        <div className={`${styles.feeRow} ${styles.feeRowTotal}`}>
          <span>Total</span>
          <span>{formatPrice(totalCents)}</span>
        </div>
      </div>

      <button
        type="button"
        className={styles.submitBtn}
        onClick={handleSubmit}
        disabled={!isValid || isPending}
        aria-busy={isPending}
      >
        {isPending ? 'Sending...' : mode === 'create' ? 'Send Offer' : 'Send Counter'}
      </button>
    </Modal>
  );
}
