'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/controls/button';
import { useToast } from '@/components/indicators/toast/context';
import useEditWizardStore from '@/features/listings/stores/edit-wizard-store';
import { WizardStoreProvider } from '@/features/listings/components/create-wizard/wizard-store-context';
import { useUpdateListing } from '@/features/listings/hooks/use-listings';
import type { ListingWithPhotos } from '@/features/listings/types/listing';
import type { WizardPhoto } from '@/features/listings/stores/wizard-photo-store';

import CategoryConditionStep from '../create-wizard/steps/category-condition-step';
import DetailsStep from '../create-wizard/steps/details-step';
import PricingStep from '../create-wizard/steps/pricing-step';
import ReviewStep from '../create-wizard/steps/review-step';
import ShippingStep from '../create-wizard/steps/shipping-step';
import WizardProgress from '../create-wizard/wizard-progress';
import styles from './edit-wizard.module.scss';

interface EditWizardProps {
  listing: ListingWithPhotos;
}

/** Edit wizard skips Photos (step 1) — photo editing is a future feature */
const EDIT_STEPS = [2, 3, 4, 5, 6] as const;
const FIRST_STEP = EDIT_STEPS[0];
const TOTAL_STEPS = 6;

const STEP_LABELS: Record<number, string> = {
  2: 'Category and Condition',
  3: 'Details',
  4: 'Pricing',
  5: 'Shipping',
  6: 'Review',
};

export default function EditWizard({ listing }: EditWizardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const updateListing = useUpdateListing();

  const step = useEditWizardStore.use.step();
  const setStep = useEditWizardStore.use.setStep();
  const shippingPreference = useEditWizardStore.use.shippingPreference();

  const [saving, setSaving] = useState(false);
  const [stepAnnouncement, setStepAnnouncement] = useState('');
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const isLocalPickup = shippingPreference === 'local_pickup';

  // Convert server photos to WizardPhoto format for ReviewStep display
  const [photos] = useState<WizardPhoto[]>(() =>
    (listing.listing_photos ?? []).map((p) => ({
      id: p.id,
      file: null,
      previewUrl: p.image_url,
      position: p.position,
    })),
  );

  // Hydrate store on mount — start at step 2 (skip Photos)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    useEditWizardStore.getState().hydrate(listing);
    setStep(FIRST_STEP);
  }, [listing, setStep]);

  // Step announcements
  const prevStepRef = useRef(step);
  useEffect(() => {
    if (step !== prevStepRef.current) {
      prevStepRef.current = step;
      const label = STEP_LABELS[step] ?? `Step ${step}`;
      setStepAnnouncement(`${label}`);
    }
  }, [step]);

  useEffect(() => {
    if (stepHeadingRef.current) {
      stepHeadingRef.current.focus();
    }
  }, [step]);

  function handleStepClick(targetStep: number) {
    // Only allow jumping to edit-mode steps (skip Photos)
    if (targetStep >= FIRST_STEP) {
      setStep(targetStep);
    }
  }

  async function handleSave() {
    const changedData = useEditWizardStore.getState().getChangedData();

    if (Object.keys(changedData).length === 0) {
      showToast({
        type: 'success',
        message: 'No changes',
        description: 'Nothing has been modified.',
      });
      return;
    }

    setSaving(true);
    try {
      await updateListing.mutateAsync({ id: listing.id, data: changedData });
      showToast({
        type: 'success',
        message: 'Changes saved',
        description: 'Your listing has been updated.',
      });
      useEditWizardStore.getState().reset();
      router.push(`/listing/${listing.id}`);
    } catch {
      showToast({
        type: 'error',
        message: 'Save failed',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    useEditWizardStore.getState().reset();
    router.back();
  }

  function renderStep() {
    switch (step) {
      case 2:
        return <CategoryConditionStep />;
      case 3:
        return <DetailsStep />;
      case 4:
        return <PricingStep />;
      case 5:
        return <ShippingStep />;
      case 6:
        return <ReviewStep photos={photos} />;
      default:
        return <CategoryConditionStep />;
    }
  }

  return (
    <WizardStoreProvider store={useEditWizardStore}>
      <div className={styles.wizard}>
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {stepAnnouncement}
        </div>

        {saving && (
          <div className={styles.savingOverlay} aria-live="polite">
            <div className={styles.savingContent}>
              <div className={styles.savingSpinner} aria-hidden="true" />
              <p className={styles.savingText}>Saving changes...</p>
            </div>
          </div>
        )}

        <header className={styles.header}>
          <button
            type="button"
            className={styles.cancelLink}
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <WizardProgress
            currentStep={step}
            totalSteps={TOTAL_STEPS}
            shippingSkipped={isLocalPickup}
            onStepClick={handleStepClick}
          />

          <button
            type="button"
            className={styles.saveLink}
            onClick={handleSave}
            disabled={saving}
            aria-busy={saving}
          >
            Save changes
          </button>
        </header>

        <main className={styles.stepContainer}>
          <h1 ref={stepHeadingRef} className="sr-only" tabIndex={-1}>
            Edit: {STEP_LABELS[step] ?? `Step ${step}`}
          </h1>
          <form onSubmit={(e) => e.preventDefault()} className={styles.stepForm}>
            {renderStep()}
          </form>
        </main>

        <footer className={styles.footer}>
          <Button style="primary" fullWidth onClick={handleSave} loading={saving} disabled={saving}>
            Save Changes
          </Button>
          <Button style="secondary" fullWidth outline onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
        </footer>
      </div>
    </WizardStoreProvider>
  );
}
