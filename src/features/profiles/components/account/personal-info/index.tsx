'use client';

import { useEffect, useState } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';
import AvatarUpload from '@/features/profiles/components/avatar-upload';
import InlineEdit from '@/components/controls/inline-edit';
import { useShopNameCheck, useUpdateProfile } from '@/features/profiles/hooks/use-profile';
import { generateSlug } from '@/features/profiles/services/profile';
import type { Profile } from '@/features/profiles/types/profile';
import { useToast } from '@/components/indicators/toast/context';
import { createClient } from '@/libs/supabase/client';
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

  const isCurrentName = debouncedName.toLowerCase() === (profile.shop_name ?? '').toLowerCase();

  const { data: isAvailable, isLoading: isChecking } = useShopNameCheck(
    isCurrentName || debouncedName.length < 2 ? '' : debouncedName,
  );

  const availabilityKnown = debouncedName.length >= 2 && !isChecking && !isCurrentName;
  const nameAvailable = isCurrentName || (availabilityKnown && isAvailable === true);
  const nameTaken = !isCurrentName && availabilityKnown && isAvailable === false;

  const showAvailabilityIcon = draftName.length >= 2 && debouncedName.length >= 2;

  const handleDisplayNameChange = (val: string) => {
    setDraftName(val);
  };

  const handleFirstNameSave = async (newFirstName: string) => {
    await updateProfile.mutateAsync({
      userId,
      data: { first_name: newFirstName || null },
    });
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { firstName: newFirstName || null },
    });
    showToast({
      message: 'Saved',
      description: 'Your first name has been updated.',
      type: 'success',
      duration: 2000,
    });
  };

  const handleLastNameSave = async (newLastName: string) => {
    await updateProfile.mutateAsync({
      userId,
      data: { last_name: newLastName || null },
    });
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { lastName: newLastName || null },
    });
    showToast({
      message: 'Saved',
      description: 'Your last name has been updated.',
      type: 'success',
      duration: 2000,
    });
  };

  const handleDisplayNameSave = async (newName: string) => {
    if (nameTaken) return;
    await updateProfile.mutateAsync({
      userId,
      data: {
        shop_name: newName,
        slug: generateSlug(newName),
      },
    });
    setDraftName('');
    setDebouncedName('');
    showToast({
      message: 'Saved',
      description: 'Your shop name has been updated.',
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
    <section className={styles.card}>
      <h2 className={styles.heading}>Personal Info</h2>
      <div className={styles.content}>
        <div className={styles.avatarSection}>
          <AvatarUpload
            displayName={profile.shop_name ?? ''}
            avatarUrl={profile.avatar_url ?? null}
            onUpload={handleAvatarUpload}
            disabled={updateProfile.isPending}
          />
        </div>

        <div className={styles.fields}>
          <div className={styles.nameRow}>
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>First name</span>
              <div className={styles.fieldValue}>
                <InlineEdit
                  value={profile.first_name ?? ''}
                  onSave={handleFirstNameSave}
                  placeholder="Add first name"
                  ariaLabel="first name"
                />
              </div>
            </div>

            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Last name</span>
              <div className={styles.fieldValue}>
                <InlineEdit
                  value={profile.last_name ?? ''}
                  onSave={handleLastNameSave}
                  placeholder="Add last name"
                  ariaLabel="last name"
                />
              </div>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Shop name</span>
            <div className={styles.fieldValue}>
              <InlineEdit
                value={profile.shop_name ?? ''}
                onSave={handleDisplayNameSave}
                onChange={handleDisplayNameChange}
                placeholder="Add a shop name"
                validating={isChecking || nameTaken}
                ariaLabel="shop name"
              />
              {showAvailabilityIcon && nameAvailable && !isChecking && (
                <span className={styles.availabilityIcon}>
                  <HiCheckCircle className={styles.iconSuccess} aria-hidden="true" />
                  <span className="sr-only">Shop name is available</span>
                </span>
              )}
              {showAvailabilityIcon && nameTaken && (
                <span className={styles.availabilityIcon}>
                  <HiXCircle className={styles.iconError} aria-hidden="true" />
                  <span className="sr-only">Shop name is taken</span>
                </span>
              )}
              {nameTaken && (
                <p className={styles.errorText} role="alert">
                  That shop name is already taken
                </p>
              )}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Handle</span>
            <span className={styles.fieldStatic}>
              {profile.slug ? `@${profile.slug}` : 'Generated from shop name'}
            </span>
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
    </section>
  );
}
