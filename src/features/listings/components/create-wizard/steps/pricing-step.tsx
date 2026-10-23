'use client';

import { useEffect, useRef, useState } from 'react';

import { useWizardStore } from '@/features/listings/components/create-wizard/wizard-store-context';
import { calculateFee, calculateNet, formatPrice } from '@/features/shared/utils/format';

import styles from './pricing-step.module.scss';

const MIN_CENTS = 100;
const MAX_CENTS = 999900;

function dollarsToDisplay(cents: number): string {
  if (cents === 0) return '';
  return (cents / 100).toFixed(2);
}

function displayToCents(display: string): number {
  const parsed = parseFloat(display);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

function calcEbayFee(cents: number): number {
  return Math.round(cents * 0.13);
}

function calcEtsyFee(cents: number): number {
  return Math.round(cents * 0.065) + 20;
}

export default function PricingStep() {
  const store = useWizardStore();
  const priceCents = store.use.priceCents();
  const shippingPreference = store.use.shippingPreference();
  const setField = store.use.setField();

  const [displayValue, setDisplayValue] = useState(() => dollarsToDisplay(priceCents));
  const [feeDisplay, setFeeDisplay] = useState(priceCents);
  const [validationError, setValidationError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDisplayValue(raw);

    const cents = displayToCents(raw);
    setField('priceCents', cents);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setFeeDisplay(cents);

      if (raw === '' || cents === 0) {
        setValidationError('Price is required');
      } else if (cents < MIN_CENTS) {
        setValidationError('Price must be at least $1.00');
      } else if (cents > MAX_CENTS) {
        setValidationError('Price must be at most $9,999.00');
      } else {
        setValidationError(null);
      }
    }, 200);
  }

  function handleBlur() {
    const cents = displayToCents(displayValue);
    if (cents > 0) {
      setDisplayValue(dollarsToDisplay(cents));
    }
  }

  function handleShippingChange(value: 'ship' | 'local_pickup') {
    setField('shippingPreference', value);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const hasValidPrice = feeDisplay >= MIN_CENTS && feeDisplay <= MAX_CENTS;
  const nessiFeeCents = hasValidPrice ? calculateFee(feeDisplay) : 0;
  const netCents = hasValidPrice ? calculateNet(feeDisplay) : 0;
  const ebayFeeCents = hasValidPrice ? calcEbayFee(feeDisplay) : 0;
  const etsyFeeCents = hasValidPrice ? calcEtsyFee(feeDisplay) : 0;

  const errorId = 'price-error';

  return (
    <div className={styles.step}>
      <section className={styles.section}>
        <h2 className={styles.heading}>Set your price</h2>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="price-input">
            Price
            <span aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </label>

          <div
            className={`${styles.priceInputWrapper} ${validationError ? styles.inputError : ''}`}
          >
            <span className={styles.currencyPrefix} aria-hidden="true">
              $
            </span>
            <input
              id="price-input"
              type="text"
              inputMode="decimal"
              className={styles.priceInput}
              value={displayValue}
              onChange={handlePriceChange}
              onBlur={handleBlur}
              placeholder="0.00"
              aria-required="true"
              aria-invalid={validationError ? 'true' : 'false'}
              aria-describedby={validationError ? errorId : undefined}
              autoComplete="off"
            />
          </div>

          {validationError && (
            <small id={errorId} className={styles.errorText} role="alert">
              {validationError}
            </small>
          )}
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

            <div className={styles.feeComparison}>
              <span className={styles.feeComparisonLabel}>How we compare</span>
              <span className={styles.feeComparisonItem}>
                eBay: ~{formatPrice(ebayFeeCents)} fee (13%)
              </span>
              <span className={styles.feeComparisonDot} aria-hidden="true">
                ·
              </span>
              <span className={styles.feeComparisonItem}>
                Etsy: ~{formatPrice(etsyFeeCents)} fee (6.5% + $0.20)
              </span>
            </div>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Shipping preference</h2>

        <div className={styles.shippingToggle} role="group" aria-label="Shipping preference">
          <button
            type="button"
            className={`${styles.shippingOption} ${shippingPreference === 'ship' ? styles.shippingOptionSelected : ''}`}
            aria-pressed={shippingPreference === 'ship'}
            onClick={() => handleShippingChange('ship')}
          >
            <span className={styles.shippingOptionTitle}>I&apos;ll ship this item</span>
            <span className={styles.shippingOptionDescription}>
              Ship to buyers anywhere in the US
            </span>
          </button>

          <button
            type="button"
            className={`${styles.shippingOption} ${shippingPreference === 'local_pickup' ? styles.shippingOptionSelected : ''}`}
            aria-pressed={shippingPreference === 'local_pickup'}
            onClick={() => handleShippingChange('local_pickup')}
          >
            <span className={styles.shippingOptionTitle}>Local pickup only</span>
            <span className={styles.shippingOptionDescription}>
              Meet locally — no shipping required
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
