'use client';

import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import CollapsibleCard from '@/components/layout/collapsible-card';
import useCreateWizardStore from '@/features/listings/stores/create-wizard-store';

import styles from './shipping-step.module.scss';

interface ShippingFormValues {
  weightLbs: number;
  weightOz: number;
  dimLength: number;
  dimWidth: number;
  dimHeight: number;
  shippingPaidBy: 'buyer' | 'seller';
}

export default function ShippingStep({ errors = {} }: { errors?: Record<string, string> }) {
  const weightOz = useCreateWizardStore.use.weightOz();
  const packageDimensions = useCreateWizardStore.use.packageDimensions();
  const shippingPaidBy = useCreateWizardStore.use.shippingPaidBy();
  const setField = useCreateWizardStore.use.setField();

  const storedLbs = Math.floor(weightOz / 16);
  const storedOz = weightOz % 16;

  const methods = useForm<ShippingFormValues>({
    mode: 'onChange',
    defaultValues: {
      weightLbs: storedLbs,
      weightOz: storedOz,
      dimLength: packageDimensions?.length ?? 0,
      dimWidth: packageDimensions?.width ?? 0,
      dimHeight: packageDimensions?.height ?? 0,
      shippingPaidBy: shippingPaidBy ?? 'buyer',
    },
  });

  const { watch, register, setValue } = methods;

  useEffect(() => {
    const subscription = watch((values, { name }) => {
      if (name === 'weightLbs' || name === 'weightOz') {
        const lbs = Number(values.weightLbs) || 0;
        const oz = Number(values.weightOz) || 0;
        setField('weightOz', lbs * 16 + oz);
      }

      if (name === 'dimLength' || name === 'dimWidth' || name === 'dimHeight') {
        const length = Number(values.dimLength) || 0;
        const width = Number(values.dimWidth) || 0;
        const height = Number(values.dimHeight) || 0;
        setField('packageDimensions', { length, width, height });
      }

      if (name === 'shippingPaidBy' && values.shippingPaidBy) {
        setField('shippingPaidBy', values.shippingPaidBy);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setField]);

  const currentShippingPaidBy = watch('shippingPaidBy');

  return (
    <FormProvider {...methods}>
      <div className={styles.step}>
        <section className={styles.section}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.heading}>Package weight</legend>
            <div className={styles.weightRow}>
              <div className={styles.inputWithSuffix}>
                <input
                  {...register('weightLbs', { valueAsNumber: true, min: 0 })}
                  id="weightLbs"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="0"
                  className={styles.numberInput}
                  aria-label="Weight in pounds"
                />
                <span className={styles.suffix} aria-hidden="true">
                  lbs
                </span>
              </div>
              <div className={styles.inputWithSuffix}>
                <input
                  {...register('weightOz', { valueAsNumber: true, min: 0, max: 15 })}
                  id="weightOz"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={15}
                  placeholder="0"
                  className={styles.numberInput}
                  aria-label="Weight in ounces"
                />
                <span className={styles.suffix} aria-hidden="true">
                  oz
                </span>
              </div>
            </div>
            {errors.weightOz && (
              <p className={styles.error} role="alert">
                {errors.weightOz}
              </p>
            )}
          </fieldset>
        </section>

        <section className={styles.section}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.heading}>Package dimensions</legend>
            <div className={styles.dimensionsRow}>
              <div className={styles.inputWithSuffix}>
                <input
                  {...register('dimLength', { valueAsNumber: true, min: 0 })}
                  id="dimLength"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="0"
                  className={styles.numberInput}
                  aria-label="Package length in inches"
                />
              </div>
              <span className={styles.separator} aria-hidden="true">
                x
              </span>
              <div className={styles.inputWithSuffix}>
                <input
                  {...register('dimWidth', { valueAsNumber: true, min: 0 })}
                  id="dimWidth"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="0"
                  className={styles.numberInput}
                  aria-label="Package width in inches"
                />
              </div>
              <span className={styles.separator} aria-hidden="true">
                x
              </span>
              <div className={styles.inputWithSuffix}>
                <input
                  {...register('dimHeight', { valueAsNumber: true, min: 0 })}
                  id="dimHeight"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="0"
                  className={styles.numberInput}
                  aria-label="Package height in inches"
                />
              </div>
              <span className={styles.suffix} aria-hidden="true">
                in
              </span>
            </div>
            <p className={styles.dimensionsLabels} aria-hidden="true">
              <span>Length</span>
              <span />
              <span>Width</span>
              <span />
              <span>Height</span>
            </p>
            {(errors['packageDimensions.length'] ||
              errors['packageDimensions.width'] ||
              errors['packageDimensions.height']) && (
              <p className={styles.error} role="alert">
                All dimensions are required
              </p>
            )}
          </fieldset>
        </section>

        <section className={styles.section}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.heading}>Who pays for shipping?</legend>
            <div
              className={styles.radioGroup}
              role="radiogroup"
              aria-label="Shipping payer"
              aria-required="true"
            >
              <label
                className={`${styles.radioOption} ${currentShippingPaidBy === 'buyer' ? styles.radioOptionSelected : ''}`}
              >
                <input
                  {...register('shippingPaidBy')}
                  type="radio"
                  value="buyer"
                  className={styles.radioInput}
                  onChange={() => setValue('shippingPaidBy', 'buyer', { shouldDirty: true })}
                />
                <span className={styles.radioLabel}>Buyer pays shipping</span>
              </label>
              <label
                className={`${styles.radioOption} ${currentShippingPaidBy === 'seller' ? styles.radioOptionSelected : ''}`}
              >
                <input
                  {...register('shippingPaidBy')}
                  type="radio"
                  value="seller"
                  className={styles.radioInput}
                  onChange={() => setValue('shippingPaidBy', 'seller', { shouldDirty: true })}
                />
                <span className={styles.radioLabel}>I&apos;ll offer free shipping</span>
              </label>
            </div>
            {errors.shippingPaidBy && (
              <p className={styles.error} role="alert">
                {errors.shippingPaidBy}
              </p>
            )}
          </fieldset>
        </section>

        <CollapsibleCard title="What box should I use?">
          <div className={styles.boxGuide}>
            <p>
              Pick a box that fits your item snugly with a little room for padding on all sides.
            </p>
            <ul className={styles.boxTips}>
              <li>Use at least 2 inches of bubble wrap or packing peanuts around the item.</li>
              <li>
                USPS Priority Mail boxes are free at any post office and work for most fishing gear.
              </li>
              <li>
                Fishing rods: use a PVC tube or ship in the original rod case to prevent breakage.
              </li>
              <li>Reels: wrap in foam or cloth and cushion inside a rigid box.</li>
              <li>Avoid oversized boxes — they increase shipping costs and can arrive damaged.</li>
            </ul>
          </div>
        </CollapsibleCard>

        <p className={styles.estimateNote} role="status" aria-live="polite">
          Estimated shipping shown at checkout
        </p>
      </div>
    </FormProvider>
  );
}
