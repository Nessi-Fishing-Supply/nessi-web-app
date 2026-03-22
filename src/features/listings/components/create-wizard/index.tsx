'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/controls/button';
import { useToast } from '@/components/indicators/toast/context';
import { useUpdateListing, useUpdateListingStatus } from '@/features/listings/hooks/use-listings';
import useCreateWizardStore from '@/features/listings/stores/create-wizard-store';
import type { ListingWithPhotos } from '@/features/listings/types/listing';
import { STEP_SCHEMAS } from '@/features/listings/validations/listing';
import type { ValidationError } from 'yup';

import CategoryConditionStep from './steps/category-condition-step';
import DetailsStep from './steps/details-step';
import PhotosStep from './steps/photos-step';
import PricingStep from './steps/pricing-step';
import ReviewStep from './steps/review-step';
import ShippingStep from './steps/shipping-step';
import WizardProgress from './wizard-progress';
import styles from './create-wizard.module.scss';

interface CreateWizardProps {
  initialDraft?: ListingWithPhotos | null;
}

const TOTAL_STEPS = 6;

const STEP_LABELS: Record<number, string> = {
  1: 'Photos',
  2: 'Category and Condition',
  3: 'Details',
  4: 'Pricing',
  5: 'Shipping',
  6: 'Review',
};

type StepComponent = React.ComponentType<{ errors?: Record<string, string> }>;

const STEP_COMPONENTS: Record<number, StepComponent> = {
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
  const updateListing = useUpdateListing();

  const step = useCreateWizardStore.use.step();
  const setStep = useCreateWizardStore.use.setStep();
  const setField = useCreateWizardStore.use.setField();
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
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animating, setAnimating] = useState(false);
  const [stepAnnouncement, setStepAnnouncement] = useState('');

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

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
      const label = STEP_LABELS[step] ?? `Step ${step}`;
      setStepAnnouncement(`Step ${step} of ${TOTAL_STEPS}: ${label}`);
      const timer = setTimeout(() => setAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Focus management: move focus to step heading on navigation
  useEffect(() => {
    if (stepHeadingRef.current) {
      stepHeadingRef.current.focus();
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
      setStepErrors({});
      goForward(false);
    } catch (err) {
      const validationError = err as ValidationError;
      const errors: Record<string, string> = {};
      if (validationError.inner) {
        validationError.inner.forEach((e) => {
          if (e.path) errors[e.path] = e.message;
        });
      }
      setStepErrors(errors);
    } finally {
      setValidating(false);
    }
  }

  function goForward(skipShipping = false) {
    const nextStep = skipShipping ? step + 2 : step + 1;
    window.history.pushState({ step: nextStep }, '');
    setDirection('forward');
    setStepErrors({});
    setStep(nextStep);
  }

  function handleBack() {
    if (step <= 1) return;
    const prevStep = step === 6 && isLocalPickup ? step - 2 : step - 1;
    window.history.pushState({ step: prevStep }, '');
    setDirection('backward');
    setStepErrors({});
    setStep(prevStep);
  }

  async function handleSaveDraftAndExit() {
    if (!listingId) {
      reset();
      router.push('/dashboard/listings');
      return;
    }

    setSavingDraft(true);
    try {
      await updateListing.mutateAsync({
        id: listingId,
        data: {
          category: category ?? undefined,
          condition: condition ?? undefined,
          title: title || undefined,
          description: description || undefined,
          price_cents: priceCents || undefined,
          shipping_paid_by: shippingPaidBy ?? undefined,
          weight_oz: weightOz || undefined,
        },
      });
      reset();
      showToast({
        type: 'success',
        message: 'Draft saved',
        description: 'You can continue editing from your listings dashboard.',
      });
      router.push('/dashboard/listings');
    } catch {
      showToast({
        type: 'error',
        message: 'Save failed',
        description: 'Something went wrong. Please try again.',
      });
      setSavingDraft(false);
    }
  }

  async function handlePublish() {
    if (!listingId) return;
    setPublishing(true);
    try {
      // Save all wizard data to the listing before publishing
      await updateListing.mutateAsync({
        id: listingId,
        data: {
          title,
          description,
          category,
          condition,
          price_cents: priceCents,
          shipping_paid_by: shippingPreference === 'ship' ? (shippingPaidBy ?? 'buyer') : null,
          weight_oz: shippingPreference === 'ship' ? weightOz : null,
        },
      });
      await updateStatus.mutateAsync({ id: listingId, status: 'active' });
      reset();
      showToast({
        type: 'success',
        message: 'Listing published!',
        description: 'Your listing is now live on Nessi.',
      });
      router.push(`/listing/${listingId}`);
    } catch {
      showToast({
        type: 'error',
        message: 'Publish failed',
        description: 'Something went wrong. Please try again.',
      });
      setPublishing(false);
    }
  }

  const ActiveStep = STEP_COMPONENTS[step] ?? PhotosStep;

  const slideClass = animating
    ? direction === 'forward'
      ? styles.slideLeft
      : styles.slideRight
    : '';

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !initialDraft) return;
    hydratedRef.current = true;

    const draftPhotos = initialDraft.listing_photos ?? [];
    const derivedShippingPreference =
      initialDraft.shipping_paid_by != null ? 'ship' : ('local_pickup' as const);

    setField('listingId', initialDraft.id);
    setField('draftId', initialDraft.id);
    setField('photos', draftPhotos);
    setField('category', initialDraft.category);
    setField('condition', initialDraft.condition);
    setField('title', initialDraft.title ?? '');
    setField('description', initialDraft.description ?? '');
    setField('priceCents', initialDraft.price_cents ?? 0);
    setField('shippingPreference', derivedShippingPreference);
    const shippingPaidByValue = initialDraft.shipping_paid_by;
    setField(
      'shippingPaidBy',
      shippingPaidByValue === 'buyer' || shippingPaidByValue === 'seller'
        ? shippingPaidByValue
        : null,
    );
    setField('weightOz', initialDraft.weight_oz ?? 0);

    const draftTitle = initialDraft.title ?? '';
    const draftDescription = initialDraft.description ?? '';
    const draftPriceCents = initialDraft.price_cents ?? 0;
    const draftWeightOz = initialDraft.weight_oz ?? 0;

    let targetStep = 1;
    if (draftPhotos.length >= 2) {
      targetStep = 2;
      if (initialDraft.category && initialDraft.condition) {
        targetStep = 3;
        if (draftTitle.length >= 10 && draftDescription.length >= 20) {
          targetStep = 4;
          if (draftPriceCents > 0) {
            targetStep = 5;
            if (derivedShippingPreference === 'local_pickup' || draftWeightOz > 0) {
              targetStep = 6;
            }
          }
        }
      }
    }

    setStep(targetStep);
  }, [initialDraft, setField, setStep]);

  return (
    <div className={styles.wizard}>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {stepAnnouncement}
      </div>

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

        <WizardProgress
          currentStep={step}
          totalSteps={TOTAL_STEPS}
          shippingSkipped={isLocalPickup}
        />

        <button
          type="button"
          className={styles.saveDraftLink}
          onClick={handleSaveDraftAndExit}
          disabled={savingDraft}
          aria-busy={savingDraft}
        >
          {savingDraft ? 'Saving…' : 'Save draft and exit'}
        </button>
      </header>

      <main className={styles.stepContainer}>
        <h1 ref={stepHeadingRef} className="sr-only" tabIndex={-1}>
          {STEP_LABELS[step] ?? `Step ${step}`}
        </h1>
        <form onSubmit={(e) => e.preventDefault()} className={`${styles.stepForm} ${slideClass}`}>
          <ActiveStep errors={stepErrors} />
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
              onClick={handleSaveDraftAndExit}
              disabled={publishing || savingDraft}
              loading={savingDraft}
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
