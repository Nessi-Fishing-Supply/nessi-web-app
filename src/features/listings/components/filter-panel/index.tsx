'use client';

import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { HiOutlineX, HiAdjustments } from 'react-icons/hi';
import type { SearchFilters } from '../../types/search';
import type { ListingCategory, ListingCondition } from '../../types/listing';
import CategoryFilter from '../category-filter';
import ConditionFilter from '../condition-filter';
import PriceRangeFilter from '../price-range-filter';
import StateFilter from '../state-filter';
import BooleanFilter from '../boolean-filter';
import SpeciesFilter from '../species-filter';
import ListingTypeFilter from '../listing-type-filter';
import styles from './filter-panel.module.scss';

interface FilterPanelProps {
  filters: SearchFilters;
  onFilterChange: (key: string, value: unknown) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  resultCount: number | undefined;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function FilterPanel({
  filters,
  onFilterChange,
  onClearAll,
  activeFilterCount,
  resultCount,
}: FilterPanelProps) {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Store trigger element and lock scroll on open
  useEffect(() => {
    if (isSheetOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => sheetRef.current?.focus());
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSheetOpen]);

  // Restore focus when sheet closes
  useEffect(() => {
    if (!isSheetOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isSheetOpen]);

  // Escape key + focus trap
  useEffect(() => {
    if (!isSheetOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSheetOpen(false);
        return;
      }

      if (event.key === 'Tab' && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;

        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSheetOpen]);

  const filterContent = (
    <>
      {activeFilterCount > 0 && (
        <button className={styles.clearAll} onClick={onClearAll} type="button">
          Clear all filters
        </button>
      )}

      <details className={styles.group} open>
        <summary className={styles.groupTitle}>Category</summary>
        <CategoryFilter
          selected={(filters.category ?? []) as ListingCategory[]}
          onChange={(val) => onFilterChange('category', val)}
        />
      </details>

      <details className={styles.group} open>
        <summary className={styles.groupTitle}>Condition</summary>
        <ConditionFilter
          selected={(filters.condition ?? []) as ListingCondition[]}
          onChange={(val) => onFilterChange('condition', val)}
        />
      </details>

      <details className={styles.group} open>
        <summary className={styles.groupTitle}>Price</summary>
        <PriceRangeFilter
          min={filters.price_min}
          max={filters.price_max}
          onChangeMin={(val) => onFilterChange('price_min', val)}
          onChangeMax={(val) => onFilterChange('price_max', val)}
        />
      </details>

      <details className={styles.group}>
        <summary className={styles.groupTitle}>Location</summary>
        <StateFilter
          value={filters.location_state}
          onChange={(val) => onFilterChange('location_state', val)}
        />
      </details>

      <div className={styles.toggleGroup}>
        <BooleanFilter
          label="Free shipping"
          checked={filters.free_shipping ?? false}
          onChange={(val) => onFilterChange('free_shipping', val)}
        />
      </div>

      <details className={styles.group}>
        <summary className={styles.groupTitle}>Species</summary>
        <SpeciesFilter
          selected={filters.species ?? []}
          onChange={(val) => onFilterChange('species', val)}
        />
      </details>

      <details className={styles.group}>
        <summary className={styles.groupTitle}>Listing Type</summary>
        <ListingTypeFilter
          selected={filters.listing_type ?? []}
          onChange={(val) => onFilterChange('listing_type', val)}
        />
      </details>
    </>
  );

  const desktopRail = (
    <aside className={styles.rail} role="region" aria-label="Filters">
      <h2 className={styles.railTitle}>Filters</h2>
      {filterContent}
    </aside>
  );

  const mobileSheet = (
    <>
      <button
        className={styles.mobileButton}
        onClick={() => setSheetOpen(true)}
        type="button"
      >
        <HiAdjustments aria-hidden="true" />
        Filters
        {activeFilterCount > 0 && (
          <span className={styles.badge}>{activeFilterCount}</span>
        )}
      </button>

      {isSheetOpen &&
        ReactDOM.createPortal(
          <div className={styles.sheetOverlay} onClick={() => setSheetOpen(false)}>
            <div
              className={styles.sheet}
              ref={sheetRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.sheetHeader}>
                <h2 className={styles.sheetTitle}>Filters</h2>
                <button
                  className={styles.sheetClose}
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close filters"
                  type="button"
                >
                  <HiOutlineX aria-hidden="true" />
                </button>
              </div>
              <div className={styles.sheetBody}>{filterContent}</div>
              <div className={styles.sheetFooter}>
                <button
                  className={styles.showResultsButton}
                  onClick={() => setSheetOpen(false)}
                  type="button"
                >
                  Show {resultCount !== undefined ? `${resultCount} ` : ''}results
                </button>
              </div>
            </div>
          </div>,
          document.getElementById('modal-root') as HTMLElement,
        )}
    </>
  );

  return (
    <>
      {desktopRail}
      {mobileSheet}
    </>
  );
}
