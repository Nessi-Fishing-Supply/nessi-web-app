'use client';

import { useState, useEffect } from 'react';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import styles from './price-range-filter.module.scss';

interface PriceRangeFilterProps {
  min: number | undefined; // cents from URL
  max: number | undefined; // cents from URL
  onChangeMin: (value: number | undefined) => void;
  onChangeMax: (value: number | undefined) => void;
}

export default function PriceRangeFilter({ min, max, onChangeMin, onChangeMax }: PriceRangeFilterProps) {
  // Display dollars, emit cents
  const [minDollars, setMinDollars] = useState(min !== undefined ? String(min / 100) : '');
  const [maxDollars, setMaxDollars] = useState(max !== undefined ? String(max / 100) : '');

  const debouncedMin = useDebouncedValue(minDollars, 500);
  const debouncedMax = useDebouncedValue(maxDollars, 500);

  // Sync URL → local state when URL params change externally
  useEffect(() => {
    setMinDollars(min !== undefined ? String(min / 100) : '');
  }, [min]);

  useEffect(() => {
    setMaxDollars(max !== undefined ? String(max / 100) : '');
  }, [max]);

  // Emit cents to parent on debounced change
  useEffect(() => {
    const parsed = parseFloat(debouncedMin);
    onChangeMin(debouncedMin && !isNaN(parsed) ? Math.round(parsed * 100) : undefined);
  }, [debouncedMin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const parsed = parseFloat(debouncedMax);
    onChangeMax(debouncedMax && !isNaN(parsed) ? Math.round(parsed * 100) : undefined);
  }, [debouncedMax]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsedMin = parseFloat(minDollars);
  const parsedMax = parseFloat(maxDollars);
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
              value={minDollars}
              onChange={(e) => setMinDollars(e.target.value.replace(/[^\d.]/g, ''))}
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
              value={maxDollars}
              onChange={(e) => setMaxDollars(e.target.value.replace(/[^\d.]/g, ''))}
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
