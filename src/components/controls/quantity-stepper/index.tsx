'use client';

import { useCallback } from 'react';
import styles from './quantity-stepper.module.scss';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  size?: 'default' | 'sm' | 'xs';
  onChange: (value: number) => void;
}

export default function QuantityStepper({
  value,
  min = 1,
  max,
  size = 'default',
  onChange,
}: QuantityStepperProps) {
  const decrement = useCallback(() => {
    if (value > min) onChange(value - 1);
  }, [value, min, onChange]);

  const increment = useCallback(() => {
    if (max === undefined || value < max) onChange(value + 1);
  }, [value, max, onChange]);

  const isAtMin = value <= min;
  const isAtMax = max !== undefined && value >= max;

  return (
    <div className={`${styles.stepper} ${styles[size]}`} role="group" aria-label="Quantity">
      <button
        type="button"
        className={styles.btn}
        onClick={decrement}
        disabled={isAtMin}
        aria-label="Decrease quantity"
      >
        &minus;
      </button>
      <span className={styles.count} aria-live="polite" aria-atomic="true">
        {value}
      </span>
      <button
        type="button"
        className={styles.btn}
        onClick={increment}
        disabled={isAtMax}
        aria-label="Increase quantity"
      >
        &#43;
      </button>
    </div>
  );
}
