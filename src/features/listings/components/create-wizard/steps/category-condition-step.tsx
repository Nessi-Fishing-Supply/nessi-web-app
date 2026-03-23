'use client';

import CategorySelector from '@/features/listings/components/category-selector';
import ConditionSelector from '@/features/listings/components/condition-selector';
import { useWizardStore } from '@/features/listings/components/create-wizard/wizard-store-context';
import type { ListingCategory, ListingCondition } from '@/features/listings/types/listing';
import styles from './category-condition-step.module.scss';

export default function CategoryConditionStep() {
  const store = useWizardStore();
  const category = store.use.category();
  const condition = store.use.condition();
  const setField = store.use.setField();

  function handleCategoryChange(value: string) {
    setField('category', value);
  }

  function handleConditionChange(value: ListingCondition) {
    setField('condition', value);
  }

  return (
    <div className={styles.step}>
      <section className={styles.section}>
        <h2 className={styles.heading}>Select a Category</h2>
        <CategorySelector value={category} onChange={handleCategoryChange} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>What condition is this item in?</h2>
        <ConditionSelector
          value={condition as ListingCondition | null}
          onChange={handleConditionChange}
          category={category as ListingCategory | undefined}
        />
      </section>
    </div>
  );
}
