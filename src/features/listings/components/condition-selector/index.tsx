'use client';

import { useState } from 'react';
import { HiChevronDown } from 'react-icons/hi';
import { CATEGORY_PHOTO_GUIDANCE, CONDITION_TIERS } from '@/features/listings/constants/condition';
import type { ListingCategory, ListingCondition } from '@/features/listings/types/listing';
import styles from './condition-selector.module.scss';

interface ConditionSelectorProps {
  value: ListingCondition | null;
  onChange: (value: ListingCondition) => void;
  category?: ListingCategory;
}

function toCategoryDisplayName(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function ConditionSelector({ value, onChange, category }: ConditionSelectorProps) {
  const [accordionOpen, setAccordionOpen] = useState(false);

  const guidanceKey = category && CATEGORY_PHOTO_GUIDANCE[category] ? category : '_default';
  const guidanceText = category ? CATEGORY_PHOTO_GUIDANCE[guidanceKey] : null;
  const categoryDisplayName = category ? toCategoryDisplayName(category) : null;

  return (
    <fieldset className={styles.fieldset} aria-required="true">
      <legend className="sr-only">Select item condition</legend>

      <div className={styles.tierList}>
        {CONDITION_TIERS.map((tier) => {
          const inputId = `condition-${tier.value}`;
          const isSelected = value === tier.value;

          return (
            <label
              key={tier.value}
              htmlFor={inputId}
              className={`${styles.tierRow}${isSelected ? ` ${styles.tierRowSelected}` : ''}`}
            >
              <input
                type="radio"
                id={inputId}
                name="condition"
                value={tier.value}
                checked={isSelected}
                onChange={() => onChange(tier.value)}
                className={styles.radioInput}
              />
              <span className={styles.radioCircle} aria-hidden="true" />
              <span className={styles.tierContent}>
                <span className={styles.tierName}>{tier.label}</span>
                <span className={styles.tierDescription}>{tier.description}</span>
              </span>
            </label>
          );
        })}
      </div>

      {category && guidanceText && (
        <div className={styles.accordion}>
          <button
            type="button"
            className={styles.accordionToggle}
            aria-expanded={accordionOpen}
            onClick={() => setAccordionOpen((prev) => !prev)}
          >
            <span>What does this mean for {categoryDisplayName}?</span>
            <HiChevronDown
              className={`${styles.accordionChevron}${accordionOpen ? ` ${styles.accordionChevronOpen}` : ''}`}
              aria-hidden="true"
            />
          </button>

          <div
            className={`${styles.accordionBody}${accordionOpen ? ` ${styles.accordionBodyOpen}` : ''}`}
          >
            <div className={styles.accordionInner}>
              <p className={styles.accordionContent}>{guidanceText}</p>
            </div>
          </div>
        </div>
      )}
    </fieldset>
  );
}
