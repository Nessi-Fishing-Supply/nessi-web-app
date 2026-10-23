'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/controls/button';
import { useToast } from '@/components/indicators/toast/context';
import useCreateWizardStore from '@/features/listings/stores/create-wizard-store';
import {
  getWizardPhotos,
  addWizardPhoto,
  removeWizardPhoto,
  reorderWizardPhotos,
  clearWizardPhotos,
} from '@/features/listings/stores/wizard-photo-store';
import type { WizardPhoto } from '@/features/listings/stores/wizard-photo-store';
import { uploadListingPhoto } from '@/features/listings/services/listing-photo';
import {
  createListing,
  updateListing,
  updateListingStatus,
} from '@/features/listings/services/listing';
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

export default function CreateWizard({ initialDraft }: CreateWizardProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const step = useCreateWizardStore.use.step();
  const setStep = useCreateWizardStore.use.setStep();
  const setField = useCreateWizardStore.use.setField();
  const reset = useCreateWizardStore.use.reset();

  const category = useCreateWizardStore.use.category();
  const condition = useCreateWizardStore.use.condition();
  const title = useCreateWizardStore.use.title();
  const description = useCreateWizardStore.use.description();
  const priceCents = useCreateWizardStore.use.priceCents();
  const shippingPreference = useCreateWizardStore.use.shippingPreference();
  const shippingPaidBy = useCreateWizardStore.use.shippingPaidBy();
  const weightOz = useCreateWizardStore.use.weightOz();

  const [photos, setPhotos] = useState<WizardPhoto[]>([]);
  const [validating, setValidating] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animating, setAnimating] = useState(false);
  const [stepAnnouncement, setStepAnnouncement] = useState('');

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const isReviewStep = step === TOTAL_STEPS;
  const isLocalPickup = shippingPreference === 'local_pickup';

  // Load photos from IndexedDB on mount
  useEffect(() => {
    getWizardPhotos().then(setPhotos);
  }, []);

  // Hydrate from initialDraft (resuming a saved draft)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !initialDraft) return;
    hydratedRef.current = true;

    setField('draftId', initialDraft.id);
    setField('category', initialDraft.category);
    setField('condition', initialDraft.condition);
    setField('title', initialDraft.title ?? '');
    setField('description', initialDraft.description ?? '');
    setField('priceCents', initialDraft.price_cents ?? 0);
    const derivedShippingPreference =
      initialDraft.shipping_paid_by != null ? 'ship' : ('local_pickup' as const);
    setField('shippingPreference', derivedShippingPreference);
    const shippingPaidByValue = initialDraft.shipping_paid_by;
    setField(
      'shippingPaidBy',
      shippingPaidByValue === 'buyer' || shippingPaidByValue === 'seller'
        ? shippingPaidByValue
        : null,
    );
    setField('weightOz', initialDraft.weight_oz ?? 0);

    // For resumed drafts, photos are already uploaded — set photo count from server data
    const draftPhotos = initialDraft.listing_photos ?? [];
    setField('photoCount', draftPhotos.length);

    // Calculate target step based on completion
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

  // Step animation and announcements
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

  useEffect(() => {
    if (stepHeadingRef.current) {
      stepHeadingRef.current.focus();
    }
  }, [step]);

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

  // Photo management callbacks (IndexedDB-backed)
  const handlePhotosAdd = useCallback(async (files: File[]) => {
    const currentPhotos = await getWizardPhotos();
    const newPhotos: WizardPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const photo = await addWizardPhoto(files[i], currentPhotos.length + i);
      newPhotos.push(photo);
    }
    const allPhotos = [...currentPhotos, ...newPhotos];
    setPhotos(allPhotos);
    useCreateWizardStore.getState().setField('photoCount', allPhotos.length);
  }, []);

  const handlePhotosChange = useCallback(async (updatedPhotos: WizardPhoto[]) => {
    await reorderWizardPhotos(updatedPhotos);
    setPhotos(updatedPhotos);
  }, []);

  const handlePhotoRemove = useCallback(async (id: string) => {
    const photo = (await getWizardPhotos()).find((p) => p.id === id);
    if (photo?.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    await removeWizardPhoto(id);
    const remaining = await getWizardPhotos();
    setPhotos(remaining);
    useCreateWizardStore.getState().setField('photoCount', remaining.length);
  }, []);

  function getStepData() {
    return {
      photoCount: photos.length,
      category,
      condition,
      title,
      description,
      priceCents,
      shippingPreference,
      shippingPaidBy,
      weightOz,
    };
  }

  async function handleNext() {
    if (isReviewStep) return;

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

  async function uploadPhotosToListing(listingId: string, photoFiles: WizardPhoto[]) {
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i].file;
      if (!file) continue;
      setSaveProgress(`Uploading photo ${i + 1} of ${photoFiles.length}...`);
      await uploadListingPhoto(file, listingId);
    }
  }

  async function handlePublish() {
    // Validate all steps before publishing
    const data = getStepData();
    for (let i = 0; i < STEP_SCHEMAS.length; i++) {
      const schema = STEP_SCHEMAS[i];
      if (!schema) continue;
      if (i === 4 && isLocalPickup) continue; // skip shipping validation for local pickup
      try {
        await schema.validate(data, { abortEarly: false });
      } catch {
        setStep(i + 1);
        showToast({
          type: 'error',
          message: 'Incomplete listing',
          description: `Please complete ${STEP_LABELS[i + 1]} before publishing.`,
        });
        return;
      }
    }

    setSaving(true);
    setSaveProgress('Creating listing...');

    try {
      const listing = await createListing({
        title,
        description,
        category,
        condition,
        price_cents: priceCents,
        shipping_paid_by: shippingPreference === 'ship' ? (shippingPaidBy ?? 'buyer') : null,
        weight_oz: shippingPreference === 'ship' ? weightOz : null,
        status: 'draft',
      });

      await uploadPhotosToListing(listing.id, photos);

      setSaveProgress('Publishing...');
      await updateListingStatus(listing.id, 'active');

      await clearWizardPhotos();
      reset();

      router.push(`/listing/${listing.id}`);
      showToast({
        type: 'success',
        message: 'Listing published!',
        description: 'Your listing is now live on Nessi.',
        subtitle: 'Share it with friends to get more views!',
      });
    } catch {
      showToast({
        type: 'error',
        message: 'Publish failed',
        description: 'Something went wrong. Please try again.',
      });
      setSaving(false);
      setSaveProgress('');
    }
  }

  async function handleSaveDraftAndExit() {
    if (photos.length === 0 && !title && !description) {
      // Nothing to save — just exit
      await clearWizardPhotos();
      reset();
      router.push('/dashboard/listings');
      return;
    }

    setSaving(true);
    setSaveProgress('Saving draft...');

    try {
      const draftId = useCreateWizardStore.getState().draftId;

      let listingId: string;
      if (draftId) {
        // Update existing draft
        await updateListing(draftId, {
          title: title || 'Untitled Draft',
          description: description || undefined,
          category: category ?? undefined,
          condition: condition ?? undefined,
          price_cents: priceCents || undefined,
          shipping_paid_by: shippingPaidBy ?? undefined,
          weight_oz: weightOz || undefined,
        });
        listingId = draftId;
      } else {
        // Create new draft
        const listing = await createListing({
          title: title || 'Untitled Draft',
          description: description || undefined,
          category: category ?? 'other',
          condition: condition ?? 'good',
          price_cents: priceCents || 0,
          shipping_paid_by: shippingPaidBy ?? undefined,
          weight_oz: weightOz || undefined,
          status: 'draft',
        });
        listingId = listing.id;
      }

      if (photos.length > 0) {
        await uploadPhotosToListing(listingId, photos);
      }

      await clearWizardPhotos();
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
      setSaving(false);
      setSaveProgress('');
    }
  }

  const slideClass = animating
    ? direction === 'forward'
      ? styles.slideLeft
      : styles.slideRight
    : '';

  function renderStep() {
    switch (step) {
      case 1:
        return (
          <PhotosStep
            photos={photos}
            onPhotosChange={handlePhotosChange}
            onPhotosAdd={handlePhotosAdd}
            onPhotoRemove={handlePhotoRemove}
          />
        );
      case 2:
        return <CategoryConditionStep />;
      case 3:
        return <DetailsStep />;
      case 4:
        return <PricingStep />;
      case 5:
        return <ShippingStep errors={stepErrors} />;
      case 6:
        return <ReviewStep photos={photos} />;
      default:
        return (
          <PhotosStep
            photos={photos}
            onPhotosChange={handlePhotosChange}
            onPhotosAdd={handlePhotosAdd}
            onPhotoRemove={handlePhotoRemove}
          />
        );
    }
  }

  return (
    <div className={styles.wizard}>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {stepAnnouncement}
      </div>

      {/* Saving overlay */}
      {saving && (
        <div className={styles.savingOverlay} aria-live="polite">
          <div className={styles.savingContent}>
            <div className={styles.savingSpinner} aria-hidden="true" />
            <p className={styles.savingText}>{saveProgress}</p>
          </div>
        </div>
      )}

      <header className={styles.header}>
        {step > 1 ? (
          <button
            type="button"
            className={styles.backLink}
            onClick={handleBack}
            aria-label="Go to previous step"
            disabled={saving}
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
          disabled={saving}
          aria-busy={saving}
        >
          Save draft and exit
        </button>
      </header>

      <main className={styles.stepContainer}>
        <h1 ref={stepHeadingRef} className="sr-only" tabIndex={-1}>
          {STEP_LABELS[step] ?? `Step ${step}`}
        </h1>
        <form onSubmit={(e) => e.preventDefault()} className={`${styles.stepForm} ${slideClass}`}>
          {renderStep()}
        </form>
      </main>

      <footer className={styles.footer}>
        {isReviewStep ? (
          <div className={styles.reviewActions}>
            <Button
              style="primary"
              fullWidth
              onClick={handlePublish}
              loading={saving}
              disabled={saving}
            >
              Publish Listing
            </Button>
            <Button
              style="secondary"
              fullWidth
              outline
              onClick={handleSaveDraftAndExit}
              disabled={saving}
              loading={saving}
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
            disabled={validating || saving}
          >
            Next
          </Button>
        )}
      </footer>
    </div>
  );
}
