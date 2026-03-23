'use client';

import { useCallback, useRef, useState } from 'react';
import styles from './price-range-filter.module.scss';

interface PriceRangeFilterProps {
  min: number | undefined; // cents from URL
  max: number | undefined; // cents from URL
  onChangeMin: (value: number | undefined) => void;
  onChangeMax: (value: number | undefined) => void;
}

function centsToDollars(cents: number | undefined): string {
  return cents !== undefined ? String(cents / 100) : '';
}

function dollarsToCents(dollars: string): number | undefined {
  const parsed = parseFloat(dollars);
  return dollars && !isNaN(parsed) ? Math.round(parsed * 100) : undefined;
}

export default function PriceRangeFilter({
  min,
  max,
  onChangeMin,
  onChangeMax,
}: PriceRangeFilterProps) {
  // Local editing state — only used while input is focused
  const [editingMin, setEditingMin] = useState<string | null>(null);
  const [editingMax, setEditingMax] = useState<string | null>(null);
  const minTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Display value: editing state when focused, prop-derived when not
  const minDisplay = editingMin !== null ? editingMin : centsToDollars(min);
  const maxDisplay = editingMax !== null ? editingMax : centsToDollars(max);

  const handleMinChange = useCallback(
    (value: string) => {
      const sanitized = value.replace(/[^\d.]/g, '');
      setEditingMin(sanitized);
      clearTimeout(minTimerRef.current);
      minTimerRef.current = setTimeout(() => {
        onChangeMin(dollarsToCents(sanitized));
      }, 500);
    },
    [onChangeMin],
  );

  const handleMaxChange = useCallback(
    (value: string) => {
      const sanitized = value.replace(/[^\d.]/g, '');
      setEditingMax(sanitized);
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = setTimeout(() => {
        onChangeMax(dollarsToCents(sanitized));
      }, 500);
    },
    [onChangeMax],
  );

  const handleMinBlur = useCallback(() => {
    clearTimeout(minTimerRef.current);
    if (editingMin !== null) {
      onChangeMin(dollarsToCents(editingMin));
    }
    setEditingMin(null);
  }, [editingMin, onChangeMin]);

  const handleMaxBlur = useCallback(() => {
    clearTimeout(maxTimerRef.current);
    if (editingMax !== null) {
      onChangeMax(dollarsToCents(editingMax));
    }
    setEditingMax(null);
  }, [editingMax, onChangeMax]);

  const parsedMin = parseFloat(minDisplay);
  const parsedMax = parseFloat(maxDisplay);
  const isInvalid = !isNaN(parsedMin) && !isNaN(parsedMax) && parsedMin > parsedMax;

  return (
    <fieldset className={styles.fieldset}>
      <legend className="sr-only">Filter by price range</legend>
      <div className={styles.row}>
        <div className={styles.inputGroup}>
          <label htmlFor="price-filter-min" className={styles.label}>
            Min
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.prefix} aria-hidden="true">
              $
            </span>
            <input
              id="price-filter-min"
              type="text"
              inputMode="numeric"
              className={styles.input}
              value={minDisplay}
              onChange={(e) => handleMinChange(e.target.value)}
              onFocus={() => setEditingMin(centsToDollars(min))}
              onBlur={handleMinBlur}
              placeholder="0"
            />
          </div>
        </div>
        <span className={styles.separator} aria-hidden="true">
          &ndash;
        </span>
        <div className={styles.inputGroup}>
          <label htmlFor="price-filter-max" className={styles.label}>
            Max
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.prefix} aria-hidden="true">
              $
            </span>
            <input
              id="price-filter-max"
              type="text"
              inputMode="numeric"
              className={styles.input}
              value={maxDisplay}
              onChange={(e) => handleMaxChange(e.target.value)}
              onFocus={() => setEditingMax(centsToDollars(max))}
              onBlur={handleMaxBlur}
              placeholder="Any"
            />
          </div>
        </div>
      </div>
      {isInvalid && (
        <p className={styles.error} role="alert">
          Min must be less than max
        </p>
      )}
    </fieldset>
  );
}
