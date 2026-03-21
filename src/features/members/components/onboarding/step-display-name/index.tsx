'use client';

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';
import { step1Schema } from '@/features/members/validations/onboarding';
import { useDisplayNameCheck } from '@/features/members/hooks/use-member';
import { generateSlug } from '@/features/members/services/member';
import AvatarUpload from '@/features/members/components/avatar-upload';
import useOnboardingStore from '@/features/members/stores/onboarding-store';
import Button from '@/components/controls/button';
import type { OnboardingStep1Data } from '@/features/members/types/onboarding';
import styles from './step-display-name.module.scss';

export default function StepDisplayName() {
  const step1Data = useOnboardingStore.use.step1Data();
  const avatarUrl = useOnboardingStore.use.avatarUrl();
  const setStep1Data = useOnboardingStore.use.setStep1Data();
  const setAvatarUrl = useOnboardingStore.use.setAvatarUrl();
  const nextStep = useOnboardingStore.use.nextStep();

  const methods = useForm<OnboardingStep1Data>({
    resolver: yupResolver(step1Schema),
    mode: 'onBlur',
    defaultValues: {
      displayName: step1Data.displayName,
    },
  });

  const {
    register,
    watch,
    formState: { errors, isValid },
  } = methods;

  const watchedName = watch('displayName') ?? '';
  const slug = generateSlug(watchedName);

  const { data: isAvailable, isLoading: isCheckingAvailability } = useDisplayNameCheck(watchedName);

  const nameIsLongEnough = watchedName.length >= 3;
  const availabilityKnown = watchedName.length >= 2 && !isCheckingAvailability;
  const nameIsTaken = availabilityKnown && isAvailable === false;
  const canProceed = nameIsLongEnough && isValid && !errors.displayName && isAvailable === true;

  const handleNext = () => {
    setStep1Data({ displayName: watchedName });
    setAvatarUrl(avatarUrl);
    nextStep();
  };

  const displayNameId = 'display-name-input';
  const errorId = 'display-name-error';
  const takenErrorId = 'display-name-taken-error';
  const slugPreviewId = 'slug-preview';

  const describedBy = [
    errors.displayName ? errorId : null,
    nameIsTaken ? takenErrorId : null,
    slugPreviewId,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <FormProvider {...methods}>
      <div className={styles.container}>
        <div className={styles.formBody}>
          <div className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>Let&#39;s get you set up</h2>
            <p className={styles.stepSubtitle}>
              Choose a name and photo that other anglers will see.
            </p>
          </div>

          <div className={styles.avatarSection}>
            <AvatarUpload
              displayName={watchedName}
              avatarUrl={avatarUrl}
              onUpload={(url) => setAvatarUrl(url)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor={displayNameId} className={styles.label}>
              Display name
              <span className={styles.required} aria-hidden="true">
                {' '}
                *
              </span>
            </label>

            <div className={styles.inputRow}>
              <input
                {...register('displayName')}
                id={displayNameId}
                type="text"
                className={`${styles.input}${errors.displayName || nameIsTaken ? ` ${styles.inputError}` : ''}${availabilityKnown && isAvailable ? ` ${styles.inputSuccess}` : ''}`}
                aria-required="true"
                aria-invalid={!!(errors.displayName || nameIsTaken)}
                aria-describedby={describedBy || undefined}
                autoComplete="nickname"
                placeholder="e.g. BassKing"
              />

              {availabilityKnown && !errors.displayName && (
                <span className={styles.availabilityIcon}>
                  {isAvailable ? (
                    <>
                      <HiCheckCircle className={styles.iconSuccess} aria-hidden="true" />
                      <span className="sr-only">Display name is available</span>
                    </>
                  ) : (
                    <>
                      <HiXCircle className={styles.iconError} aria-hidden="true" />
                      <span className="sr-only">Display name is taken</span>
                    </>
                  )}
                </span>
              )}
            </div>

            {errors.displayName && (
              <p id={errorId} className={styles.errorText} role="alert">
                {errors.displayName.message}
              </p>
            )}

            {nameIsTaken && !errors.displayName && (
              <p id={takenErrorId} className={styles.errorText} role="alert">
                That display name is already taken
              </p>
            )}

            {watchedName.length > 0 && (
              <p id={slugPreviewId} className={styles.slugPreview} aria-live="polite">
                @{slug}
              </p>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <Button
            type="button"
            style="primary"
            fullWidth
            disabled={!canProceed}
            onClick={handleNext}
            ariaLabel="Continue to next step"
          >
            Next
          </Button>
        </div>
      </div>
    </FormProvider>
  );
}
