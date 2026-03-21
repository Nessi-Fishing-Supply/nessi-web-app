'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import useOnboardingStore from '@/features/members/stores/onboarding-store';
import ProgressIndicator from '@/features/members/components/onboarding/progress-indicator';
import StepDisplayName from '@/features/members/components/onboarding/step-display-name';
import StepIntent from '@/features/members/components/onboarding/step-intent';
import StepFishingIdentity from '@/features/members/components/onboarding/step-fishing-identity';
import StepSellerType from '@/features/members/components/onboarding/step-seller-type';
import StepBio from '@/features/members/components/onboarding/step-bio';
import styles from './onboarding-wizard.module.scss';

function computeVisualStep(currentStep: number, isBuyer: boolean): number {
  if (isBuyer) {
    // Buyer path: internal 1,2,3,5 → visual 1,2,3,4
    if (currentStep <= 3) return currentStep;
    if (currentStep === 5) return 4;
  }
  return currentStep;
}

export default function OnboardingWizard() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const currentStep = useOnboardingStore.use.currentStep();
  const intentData = useOnboardingStore.use.intentData();
  const totalSteps = useOnboardingStore.use.totalSteps();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const isBuyer = intentData.intent === 'buyer';
  const visualStep = computeVisualStep(currentStep, isBuyer);

  return (
    <div className={styles.wizard}>
      <div className={styles.progressWrapper}>
        <ProgressIndicator currentStep={visualStep} totalSteps={totalSteps} />
      </div>
      <div className={styles.stepContent}>
        {currentStep === 1 && <StepDisplayName />}
        {currentStep === 2 && <StepIntent />}
        {currentStep === 3 && <StepFishingIdentity />}
        {currentStep === 4 && !isBuyer && <StepSellerType />}
        {currentStep === 5 && <StepBio />}
      </div>
    </div>
  );
}
