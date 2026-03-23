'use client';

import { HiOutlineX } from 'react-icons/hi';

import styles from './filter-chip.module.scss';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export default function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className={styles.chip}>
      <span className={styles.label}>{label}</span>
      <button
        className={styles.removeButton}
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        type="button"
      >
        <HiOutlineX aria-hidden="true" />
      </button>
    </span>
  );
}
