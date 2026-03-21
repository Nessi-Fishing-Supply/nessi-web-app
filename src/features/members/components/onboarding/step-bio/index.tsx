'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/controls/button';
import { useToast } from '@/components/indicators/toast/context';
import { useAuth } from '@/features/auth/context';
import { useUpdateMember, useCompleteOnboarding } from '@/features/members/hooks/use-member';
import { generateSlug } from '@/features/members/services/member';
import useOnboardingStore from '@/features/members/stores/onboarding-store';

import styles from './step-bio.module.scss';

const MAX_CHARS = 280;
const WARN_THRESHOLD = 260;

export default function StepBio() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const step1Data = useOnboardingStore.use.step1Data();
  const intentData = useOnboardingStore.use.intentData();
  const fishingData = useOnboardingStore.use.fishingData();
  const sellerTypeData = useOnboardingStore.use.sellerTypeData();
  const bioData = useOnboardingStore.use.bioData();
  const avatarUrl = useOnboardingStore.use.avatarUrl();
  const setBioData = useOnboardingStore.use.setBioData();
  const prevStep = useOnboardingStore.use.prevStep();
  const reset = useOnboardingStore.use.reset();

  const [bio, setBio] = useState(bioData.bio);

  const updateMember = useUpdateMember();
  const completeOnboarding = useCompleteOnboarding();

  const charCount = bio.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount > WARN_THRESHOLD;

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBio(value);
    setBioData({ bio: value });
  };

  const handleFinish = async (skipBio = false) => {
    if (!user?.id) return;

    const bioValue = skipBio ? '' : bio;

    const isSeller = intentData.intent === 'seller' && sellerTypeData.sellerType === 'free';

    try {
      await updateMember.mutateAsync({
        userId: user.id,
        data: {
          display_name: step1Data.displayName,
          slug: generateSlug(step1Data.displayName),
          avatar_url: avatarUrl,
          primary_species: fishingData.primarySpecies,
          primary_technique: fishingData.primaryTechnique,
          home_state: fishingData.homeState || null,
          bio: bioValue || null,
          ...(isSeller ? { is_seller: true } : {}),
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

  const isPending = updateMember.isPending || completeOnboarding.isPending;

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
