'use client';

import { US_STATES } from '../../config/us-states';
import styles from './state-filter.module.scss';

interface StateFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export default function StateFilter({ value, onChange }: StateFilterProps) {
  return (
    <div className={styles.container}>
      <label htmlFor="state-filter" className={styles.label}>
        Location
      </label>
      <select
        id="state-filter"
        className={styles.select}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">All states</option>
        {US_STATES.map((state) => (
          <option key={state.value} value={state.value}>
            {state.label}
          </option>
        ))}
      </select>
    </div>
  );
}
