'use client';

import { CONDITION_TIERS } from '@/features/listings/constants/condition';
import type { ListingCondition } from '@/features/listings/types/listing';
import styles from './condition-filter.module.scss';

interface ConditionFilterProps {
  selected: ListingCondition[];
  onChange: (selected: ListingCondition[]) => void;
  counts?: Partial<Record<ListingCondition, number>>;
}

export default function ConditionFilter({ selected, onChange, counts }: ConditionFilterProps) {
  function handleChange(value: ListingCondition) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className="sr-only">Filter by condition</legend>

      <div className={styles.list}>
        {CONDITION_TIERS.map((tier) => {
          const inputId = `condition-filter-${tier.value}`;
          const isChecked = selected.includes(tier.value);
          const count = counts?.[tier.value];

          return (
            <label key={tier.value} htmlFor={inputId} className={styles.row}>
              <input
                type="checkbox"
                id={inputId}
                value={tier.value}
                checked={isChecked}
                onChange={() => handleChange(tier.value)}
                className={styles.checkboxInput}
              />
              <span className={styles.checkbox} aria-hidden="true" />
              <span className={styles.label}>{tier.label}</span>
              {counts !== undefined && count !== undefined && (
                <span className={styles.count}>({count})</span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
