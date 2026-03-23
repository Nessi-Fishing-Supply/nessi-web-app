'use client';

import type { SearchFilters } from '../../types/search';
import type { ListingCategory } from '../../types/listing';
import { getCategoryLabel } from '../../constants/category';
import { CONDITION_TIERS } from '../../constants/condition';
import { US_STATES } from '../../config/us-states';
import FilterChip from '../filter-chip';
import styles from './filter-chips.module.scss';

interface FilterChipsProps {
  filters: SearchFilters;
  onRemoveFilter: (key: string, value?: string) => void;
  onClearAll: () => void;
}

const LISTING_TYPE_LABELS: Record<string, string> = {
  used: 'Used',
  custom: 'Custom / Handmade',
  new: 'New',
};

function getConditionLabel(value: string): string {
  return CONDITION_TIERS.find((t) => t.value === value)?.label ?? value;
}

function getStateLabel(code: string): string {
  return US_STATES.find((s) => s.value === code)?.label ?? code;
}

export default function FilterChips({ filters, onRemoveFilter, onClearAll }: FilterChipsProps) {
  const chips: { key: string; value?: string; label: string }[] = [];

  filters.category?.forEach((cat) => {
    chips.push({ key: 'category', value: cat, label: getCategoryLabel(cat as ListingCategory) });
  });

  filters.condition?.forEach((cond) => {
    chips.push({ key: 'condition', value: cond, label: getConditionLabel(cond) });
  });

  if (filters.price_min !== undefined || filters.price_max !== undefined) {
    const min = filters.price_min !== undefined ? `$${(filters.price_min / 100).toFixed(0)}` : '$0';
    const max =
      filters.price_max !== undefined ? `$${(filters.price_max / 100).toFixed(0)}` : 'Any';
    chips.push({ key: 'price', label: `${min} – ${max}` });
  }

  if (filters.location_state) {
    chips.push({ key: 'location_state', label: getStateLabel(filters.location_state) });
  }

  if (filters.free_shipping) {
    chips.push({ key: 'free_shipping', label: 'Free shipping' });
  }

  filters.species?.forEach((sp) => {
    chips.push({ key: 'species', value: sp, label: sp.charAt(0).toUpperCase() + sp.slice(1) });
  });

  filters.listing_type?.forEach((lt) => {
    chips.push({ key: 'listing_type', value: lt, label: LISTING_TYPE_LABELS[lt] ?? lt });
  });

  if (chips.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.chips}>
        {chips.map((chip, i) => (
          <FilterChip
            key={`${chip.key}-${chip.value ?? i}`}
            label={chip.label}
            onRemove={() => {
              if (chip.key === 'price') {
                onRemoveFilter('price_min');
                onRemoveFilter('price_max');
              } else {
                onRemoveFilter(chip.key, chip.value);
              }
            }}
          />
        ))}
      </div>
      <button className={styles.clearAll} onClick={onClearAll} type="button">
        Clear all filters
      </button>
    </div>
  );
}
