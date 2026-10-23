'use client';

import Toggle from '@/components/controls/toggle';
import styles from './boolean-filter.module.scss';

interface BooleanFilterProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function BooleanFilter({ label, checked, onChange }: BooleanFilterProps) {
  const inputId = `boolean-filter-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={styles.row}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <Toggle id={inputId} checked={checked} onChange={onChange} />
    </div>
  );
}
