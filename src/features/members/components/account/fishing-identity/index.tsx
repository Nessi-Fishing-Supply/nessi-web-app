'use client';

import PillSelector from '@/components/controls/pill-selector';
import { useToast } from '@/components/indicators/toast/context';
import CollapsibleCard from '@/components/layout/collapsible-card';
import InlineEdit from '@/components/controls/inline-edit';
import { useUpdateMember } from '@/features/members/hooks/use-member';
import type { Member } from '@/features/members/types/member';
import { SPECIES_OPTIONS, TECHNIQUE_OPTIONS, US_STATES } from '@/features/members/types/onboarding';

import styles from './fishing-identity.module.scss';

interface FishingIdentityProps {
  member: Member;
  userId: string;
}

export default function FishingIdentity({ member, userId }: FishingIdentityProps) {
  const updateMember = useUpdateMember();
  const { showToast } = useToast();

  const handleSpeciesChange = async (selected: string[]) => {
    await updateMember.mutateAsync({ userId, data: { primary_species: selected } });
    showToast({
      message: 'Saved',
      description: 'Your changes have been saved',
      type: 'success',
      duration: 2000,
    });
  };

  const handleTechniqueChange = async (selected: string[]) => {
    await updateMember.mutateAsync({ userId, data: { primary_technique: selected } });
    showToast({
      message: 'Saved',
      description: 'Your changes have been saved',
      type: 'success',
      duration: 2000,
    });
  };

  const handleStateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    await updateMember.mutateAsync({ userId, data: { home_state: value || null } });
    showToast({
      message: 'Saved',
      description: 'Your changes have been saved',
      type: 'success',
      duration: 2000,
    });
  };

  const handleYearsSave = async (val: string) => {
    const parsed = parseInt(val, 10);
    await updateMember.mutateAsync({ userId, data: { years_fishing: parsed || null } });
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
              selected={member.primary_species ?? []}
              onChange={handleSpeciesChange}
              label="Species"
            />
          </div>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>How do you fish?</p>
            <PillSelector
              options={TECHNIQUE_OPTIONS}
              selected={member.primary_technique ?? []}
              onChange={handleTechniqueChange}
              label="Technique"
            />
          </div>
        </div>

        <div className={styles.detailsRow}>
          <div className={styles.section}>
            <label htmlFor="homeState" className={styles.sectionLabel}>
              Home state
            </label>
            <select
              id="homeState"
              className={styles.select}
              value={member.home_state ?? ''}
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
              value={member.years_fishing != null ? String(member.years_fishing) : ''}
              onSave={handleYearsSave}
              placeholder="Add years fishing"
              ariaLabel="years fishing"
              compact
            />
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
}
