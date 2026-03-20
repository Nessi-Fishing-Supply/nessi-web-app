'use client';

import PillSelector from '@/components/controls/pill-selector';
import { useToast } from '@/components/indicators/toast/context';
import CollapsibleCard from '@/components/layout/collapsible-card';
import InlineEdit from '@/components/controls/inline-edit';
import { useUpdateProfile } from '@/features/profiles/hooks/use-profile';
import type { Profile } from '@/features/profiles/types/profile';
import {
  SPECIES_OPTIONS,
  TECHNIQUE_OPTIONS,
  US_STATES,
} from '@/features/profiles/types/onboarding';

import styles from './fishing-identity.module.scss';

interface FishingIdentityProps {
  profile: Profile;
  userId: string;
}

export default function FishingIdentity({ profile, userId }: FishingIdentityProps) {
  const updateProfile = useUpdateProfile();
  const { showToast } = useToast();

  const handleSpeciesChange = async (selected: string[]) => {
    await updateProfile.mutateAsync({ userId, data: { primary_species: selected } });
    showToast({
      message: 'Saved',
      description: 'Your changes have been saved',
      type: 'success',
      duration: 2000,
    });
  };

  const handleTechniqueChange = async (selected: string[]) => {
    await updateProfile.mutateAsync({ userId, data: { primary_technique: selected } });
    showToast({
      message: 'Saved',
      description: 'Your changes have been saved',
      type: 'success',
      duration: 2000,
    });
  };

  const handleStateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    await updateProfile.mutateAsync({ userId, data: { home_state: value || null } });
    showToast({
      message: 'Saved',
      description: 'Your changes have been saved',
      type: 'success',
      duration: 2000,
    });
  };

  const handleYearsSave = async (val: string) => {
    const parsed = parseInt(val, 10);
    await updateProfile.mutateAsync({ userId, data: { years_fishing: parsed || null } });
    showToast({
      message: 'Saved',
      description: 'Your changes have been saved',
      type: 'success',
      duration: 2000,
    });
  };

  return (
    <CollapsibleCard title="Fishing Identity">
      <div className={styles.content}>
        <div className={styles.pillGrid}>
          <div className={styles.section}>
            <p className={styles.sectionLabel}>What do you fish for?</p>
            <PillSelector
              options={SPECIES_OPTIONS}
              selected={profile.primary_species ?? []}
              onChange={handleSpeciesChange}
              label="Species"
            />
          </div>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>How do you fish?</p>
            <PillSelector
              options={TECHNIQUE_OPTIONS}
              selected={profile.primary_technique ?? []}
              onChange={handleTechniqueChange}
              label="Technique"
            />
          </div>
        </div>

        <div className={styles.section}>
          <label htmlFor="homeState" className={styles.sectionLabel}>
            Home state
          </label>
          <select
            id="homeState"
            className={styles.select}
            value={profile.home_state ?? ''}
            onChange={handleStateChange}
          >
            <option value="">Select state</option>
            {US_STATES.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionLabel}>Years fishing</p>
          <InlineEdit
            value={profile.years_fishing != null ? String(profile.years_fishing) : ''}
            onSave={handleYearsSave}
            placeholder="Add years fishing"
            ariaLabel="years fishing"
          />
        </div>
      </div>
    </CollapsibleCard>
  );
}
