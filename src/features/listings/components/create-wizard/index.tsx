'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/controls/button';
import { useToast } from '@/components/indicators/toast/context';
import { useUpdateListingStatus } from '@/features/listings/hooks/use-listings';
import useCreateWizardStore from '@/features/listings/stores/create-wizard-store';
import type { Listing } from '@/features/listings/types/listing';
import { STEP_SCHEMAS } from '@/features/listings/validations/listing';

import CategoryConditionStep from './steps/category-condition-step';
import DetailsStep from './steps/details-step';
import PhotosStep from './steps/photos-step';
import PricingStep from './steps/pricing-step';
import ReviewStep from './steps/review-step';
import ShippingStep from './steps/shipping-step';
import WizardProgress from './wizard-progress';
import styles from './create-wizard.module.scss';

interface CreateWizardProps {
  initialDraft?: Listing | null;
}

const TOTAL_STEPS = 6;

const STEP_COMPONENTS: Record<number, () => React.ReactElement> = {
  1: PhotosStep,
  2: CategoryConditionStep,
  3: DetailsStep,
  4: PricingStep,
  5: ShippingStep,
  6: ReviewStep,
};

export default function CreateWizard({ initialDraft }: CreateWizardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const updateStatus = useUpdateListingStatus();

  const step = useCreateWizardStore.use.step();
  const setStep = useCreateWizardStore.use.setStep();
  const listingId = useCreateWizardStore.use.listingId();
  const reset = useCreateWizardStore.use.reset();

  // Store state needed for validation
  const photos = useCreateWizardStore.use.photos();
  const category = useCreateWizardStore.use.category();
  const condition = useCreateWizardStore.use.condition();
  const title = useCreateWizardStore.use.title();
  const description = useCreateWizardStore.use.description();
  const fishingHistory = useCreateWizardStore.use.fishingHistory();
  const priceCents = useCreateWizardStore.use.priceCents();
  const shippingPreference = useCreateWizardStore.use.shippingPreference();
  const shippingPaidBy = useCreateWizardStore.use.shippingPaidBy();
  const weightOz = useCreateWizardStore.use.weightOz();
  const packageDimensions = useCreateWizardStore.use.packageDimensions();

  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animating, setAnimating] = useState(false);

  const isReviewStep = step === TOTAL_STEPS;

  // Browser back button support
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const prevStep = event.state?.step;
      if (typeof prevStep === 'number' && prevStep >= 1) {
        setDirection('backward');
        setStep(prevStep);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setStep]);

  // Push history state on forward navigation
  const prevStepRef = useRef(step);
  useEffect(() => {
    if (step !== prevStepRef.current) {
      prevStepRef.current = step;
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [step]);

  function getStepData() {
    return {
      photos,
      category,
      condition,
      title,
      description,
      fishingHistory,
      priceCents,
      shippingPreference,
      shippingPaidBy,
      weightOz,
      packageDimensions,
    };
  }

  const isLocalPickup = shippingPreference === 'local_pickup';

  async function handleNext() {
    if (isReviewStep) return;

    // When on step 4 (pricing) with local pickup, skip step 5 (shipping) validation and jump to step 6
    const skipShipping = step === 4 && isLocalPickup;
    const schema = skipShipping ? undefined : STEP_SCHEMAS[step - 1];

    if (!schema) {
      goForward(skipShipping);
      return;
    }

    setValidating(true);
    try {
      await schema.validate(getStepData(), { abortEarly: false });
      goForward(false);
    } catch {
      // Validation errors — step components handle display
    } finally {
      setValidating(false);
    }
  }

  function goForward(skipShipping = false) {
    const nextStep = skipShipping ? step + 2 : step + 1;
    window.history.pushState({ step: nextStep }, '');
    setDirection('forward');
    setStep(nextStep);
  }

  function handleBack() {
    if (step <= 1) return;
    // When on step 6 (review) with local pickup, go back to step 4 (pricing) skipping step 5
    const prevStep = step === 6 && isLocalPickup ? step - 2 : step - 1;
    window.history.pushState({ step: prevStep }, '');
    setDirection('backward');
    setStep(prevStep);
  }

  function handleSaveDraftAndExit() {
    // Save logic wired in Task 4.3
  }

  async function handlePublish() {
    if (!listingId) return;
    setPublishing(true);
    try {
      await updateStatus.mutateAsync({ id: listingId, status: 'active' });
      reset();
      showToast({
        type: 'success',
        message: 'Listing published!',
        description: 'Your listing is now live on Nessi.',
      });
      router.push(`/item/${listingId}`);
    } catch {
      showToast({
        type: 'error',
        message: 'Publish failed',
        description: 'Something went wrong. Please try again.',
      });
      setPublishing(false);
    }
  }

  function handleSaveDraft() {
    reset();
    showToast({
      type: 'success',
      message: 'Draft saved',
      description: 'You can continue editing from your listings dashboard.',
    });
    router.push('/dashboard/listings');
  }

  const ActiveStep = STEP_COMPONENTS[step] ?? PhotosStep;

  const slideClass = animating
    ? direction === 'forward'
      ? styles.slideLeft
      : styles.slideRight
    : '';

  // Suppress unused warning — initialDraft will be used in Task 4.2
  void initialDraft;

  return (
    <div className={styles.wizard}>
      <header className={styles.header}>
        {step > 1 ? (
          <button
            type="button"
            className={styles.backLink}
            onClick={handleBack}
            aria-label="Go to previous step"
          >
            Back
          </button>
        ) : (
          <span className={styles.backPlaceholder} />
        )}

        <WizardProgress currentStep={step} totalSteps={TOTAL_STEPS} shippingSkipped={isLocalPickup} />

        <button
          type="button"
          className={styles.saveDraftLink}
          onClick={handleSaveDraftAndExit}
        >
          Save draft and exit
        </button>
      </header>

      <main className={styles.stepContainer}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className={`${styles.stepForm} ${slideClass}`}
        >
          <ActiveStep />
        </form>
      </main>

      <footer className={styles.footer}>
        {isReviewStep ? (
          <div className={styles.reviewActions}>
            <Button
              style="primary"
              fullWidth
              onClick={handlePublish}
              loading={publishing}
              disabled={publishing || !listingId}
            >
              Publish Listing
            </Button>
            <Button
              style="secondary"
              fullWidth
              outline
              onClick={handleSaveDraft}
              disabled={publishing}
            >
              Save as Draft
            </Button>
          </div>
        ) : (
          <Button
            style="primary"
            fullWidth
            onClick={handleNext}
            loading={validating}
            disabled={validating}
          >
            Next
          </Button>
        )}
      </footer>
    </div>
  );
}
