'use client';

import { useEffect, useState } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';
import AvatarUpload from '@/features/profiles/components/avatar-upload';
import CollapsibleCard from '@/components/layout/collapsible-card';
import InlineEdit from '@/components/controls/inline-edit';
import { useDisplayNameCheck, useUpdateProfile } from '@/features/profiles/hooks/use-profile';
import { generateSlug } from '@/features/profiles/services/profile';
import type { Profile } from '@/features/profiles/types/profile';
import { useToast } from '@/components/indicators/toast/context';
import styles from './personal-info.module.scss';

interface PersonalInfoProps {
  profile: Profile;
  userId: string;
}

export default function PersonalInfo({ profile, userId }: PersonalInfoProps) {
  const { showToast } = useToast();
  const updateProfile = useUpdateProfile();

  const [draftName, setDraftName] = useState('');
  const [debouncedName, setDebouncedName] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(draftName);
    }, 400);
    return () => clearTimeout(timer);
  }, [draftName]);

  const isCurrentName =
    debouncedName.toLowerCase() === (profile.display_name ?? '').toLowerCase();

  const { data: isAvailable, isLoading: isChecking } = useDisplayNameCheck(
    isCurrentName || debouncedName.length < 2 ? '' : debouncedName,
  );

  const availabilityKnown = debouncedName.length >= 2 && !isChecking && !isCurrentName;
  const nameAvailable = isCurrentName || (availabilityKnown && isAvailable === true);
  const nameTaken = !isCurrentName && availabilityKnown && isAvailable === false;

  const showAvailabilityIcon = draftName.length >= 2 && debouncedName.length >= 2;

  const handleDisplayNameChange = (val: string) => {
    setDraftName(val);
  };

  const handleDisplayNameSave = async (newName: string) => {
    if (nameTaken) return;
    await updateProfile.mutateAsync({
      userId,
      data: {
        display_name: newName,
        slug: generateSlug(newName),
      },
    });
    setDraftName('');
    setDebouncedName('');
    showToast({
      message: 'Saved',
      description: 'Your display name has been updated.',
      type: 'success',
      duration: 2000,
    });
  };

  const handleBioSave = async (newBio: string) => {
    await updateProfile.mutateAsync({
      userId,
      data: { bio: newBio || null },
    });
    showToast({
      message: 'Saved',
      description: 'Your bio has been updated.',
      type: 'success',
      duration: 2000,
    });
  };

  const handleAvatarUpload = async (url: string) => {
    await updateProfile.mutateAsync({
      userId,
      data: { avatar_url: url },
    });
    showToast({
      message: 'Saved',
      description: 'Your profile photo has been updated.',
      type: 'success',
      duration: 2000,
    });
  };

  return (
    <CollapsibleCard title="Personal Info" defaultExpanded>
      <div className={styles.content}>
        <div className={styles.avatarSection}>
          <AvatarUpload
            displayName={profile.display_name ?? ''}
            avatarUrl={profile.avatar_url ?? null}
            onUpload={handleAvatarUpload}
            disabled={updateProfile.isPending}
          />
        </div>

        <div className={styles.fields}>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Display name</span>
            <div className={styles.fieldValue}>
              <InlineEdit
                value={profile.display_name ?? ''}
                onSave={handleDisplayNameSave}
                onChange={handleDisplayNameChange}
                placeholder="Add a display name"
                validating={isChecking || nameTaken}
                ariaLabel="display name"
              />
              {showAvailabilityIcon && nameAvailable && !isChecking && (
                <span className={styles.availabilityIcon}>
                  <HiCheckCircle className={styles.iconSuccess} aria-hidden="true" />
                  <span className="sr-only">Display name is available</span>
                </span>
              )}
              {showAvailabilityIcon && nameTaken && (
                <span className={styles.availabilityIcon}>
                  <HiXCircle className={styles.iconError} aria-hidden="true" />
                  <span className="sr-only">Display name is taken</span>
                </span>
              )}
              {nameTaken && (
                <p className={styles.errorText} role="alert">
                  That display name is already taken
                </p>
              )}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Bio</span>
            <div className={styles.fieldValue}>
              <InlineEdit
                value={profile.bio ?? ''}
                onSave={handleBioSave}
                maxLength={280}
                multiline
                placeholder="Tell buyers and sellers about yourself"
                ariaLabel="bio"
              />
            </div>
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
}
