'use client';

import React, { useState } from 'react';

import Button from '@/components/controls/button';
import PillSelector from '@/components/controls/pill-selector';
import useOnboardingStore from '@/features/members/stores/onboarding-store';
import { SPECIES_OPTIONS, TECHNIQUE_OPTIONS, US_STATES } from '@/features/members/types/onboarding';

import styles from './step-fishing-identity.module.scss';

export default function StepFishingIdentity() {
  const fishingData = useOnboardingStore.use.fishingData();
  const setFishingData = useOnboardingStore.use.setFishingData();
  const nextStep = useOnboardingStore.use.nextStep();
  const prevStep = useOnboardingStore.use.prevStep();

  const [primarySpecies, setPrimarySpecies] = useState<string[]>(fishingData.primarySpecies);
  const [primaryTechnique, setPrimaryTechnique] = useState<string[]>(fishingData.primaryTechnique);
  const [homeState, setHomeState] = useState<string>(fishingData.homeState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFishingData({ primarySpecies, primaryTechnique, homeState });
    nextStep();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={prevStep}>
          Back
        </button>
      </div>

      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>What&#39;s your style?</h2>
        <p className={styles.stepSubtitle}>Help us personalize your experience. All optional.</p>
      </div>

      <div className={styles.sections}>
        <div className={styles.section}>
          <p className={styles.sectionLabel}>What do you fish for?</p>
          <PillSelector
            options={SPECIES_OPTIONS}
            selected={primarySpecies}
            onChange={setPrimarySpecies}
            label="Species you fish for"
          />
        </div>

        <div className={styles.section}>
          <p className={styles.sectionLabel}>How do you fish?</p>
          <PillSelector
            options={TECHNIQUE_OPTIONS}
            selected={primaryTechnique}
            onChange={setPrimaryTechnique}
            label="Fishing techniques you use"
          />
        </div>

        <div className={styles.section}>
          <label htmlFor="homeState" className={styles.sectionLabel}>
            Home state
          </label>
          <select
            id="homeState"
            className={styles.select}
            value={homeState}
            onChange={(e) => setHomeState(e.target.value)}
          >
            <option value="">Select a state</option>
            {US_STATES.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.footer}>
        <Button type="submit" fullWidth>
          Next
        </Button>
      </div>
    </form>
  );
}
