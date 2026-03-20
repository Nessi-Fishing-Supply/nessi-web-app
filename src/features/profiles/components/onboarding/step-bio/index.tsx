'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/controls/button';
import { useToast } from '@/components/indicators/toast/context';
import { useAuth } from '@/features/auth/context';
import { useUpdateProfile, useCompleteOnboarding } from '@/features/profiles/hooks/use-profile';
import { generateSlug } from '@/features/profiles/services/profile';
import useOnboardingStore from '@/features/profiles/stores/onboarding-store';

import styles from './step-bio.module.scss';

const MAX_CHARS = 280;
const WARN_THRESHOLD = 260;

export default function StepBio() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const step1Data = useOnboardingStore.use.step1Data();
  const step2Data = useOnboardingStore.use.step2Data();
  const step3Data = useOnboardingStore.use.step3Data();
  const avatarUrl = useOnboardingStore.use.avatarUrl();
  const setStep3Data = useOnboardingStore.use.setStep3Data();
  const prevStep = useOnboardingStore.use.prevStep();
  const reset = useOnboardingStore.use.reset();

  const [bio, setBio] = useState(step3Data.bio);

  const updateProfile = useUpdateProfile();
  const completeOnboarding = useCompleteOnboarding();

  const charCount = bio.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount > WARN_THRESHOLD;

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBio(value);
    setStep3Data({ bio: value });
  };

  const handleFinish = async (skipBio = false) => {
    if (!user?.id) return;

    const bioValue = skipBio ? '' : bio;

    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        data: {
          shop_name: step1Data.displayName,
          slug: generateSlug(step1Data.displayName),
          avatar_url: avatarUrl,
          primary_species: step2Data.primarySpecies,
          primary_technique: step2Data.primaryTechnique,
          home_state: step2Data.homeState || null,
          bio: bioValue || null,
        },
      });

      await completeOnboarding.mutateAsync(user.id);

      showToast({
        message: 'Welcome to Nessi!',
        description: 'Your profile is all set.',
        type: 'success',
      });

      reset();
      router.push('/');
    } catch {
      showToast({
        message: 'Something went wrong.',
        description: 'Please try again.',
        type: 'error',
      });
    }
  };

  const isPending = updateProfile.isPending || completeOnboarding.isPending;

  return (
    <div className={styles.container}>
      <button type="button" className={styles.backLink} onClick={prevStep}>
        Back
      </button>

      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Tell your story</h2>
        <p className={styles.stepSubtitle}>
          A short bio helps build trust with buyers and sellers.
        </p>
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="bio" className={styles.label}>
          Bio
        </label>
        <textarea
          id="bio"
          className={styles.textarea}
          value={bio}
          onChange={handleBioChange}
          maxLength={MAX_CHARS + 1}
          placeholder="How long you've been fishing, where you fish, what you target. Buyers and sellers want to know who they're dealing with."
          aria-describedby="bio-counter"
          aria-label="Tell buyers and sellers about yourself"
          rows={5}
        />
        <span
          id="bio-counter"
          className={`${styles.charCounter} ${isNearLimit ? styles.charCounterWarn : ''}`}
          aria-live="polite"
        >
          {charCount} / {MAX_CHARS}
        </span>
      </div>

      <div className={styles.actions}>
        <Button
          type="button"
          fullWidth
          loading={isPending}
          disabled={isPending || isOverLimit}
          onClick={() => handleFinish(false)}
        >
          Finish
        </Button>

        <button
          type="button"
          className={styles.skipLink}
          onClick={() => handleFinish(true)}
          disabled={isPending}
          aria-label="Skip bio and complete setup"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
