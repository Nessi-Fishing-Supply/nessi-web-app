'use client';

import { useEffect, useState } from 'react';
import { HiCheckCircle, HiXCircle, HiUser } from 'react-icons/hi';
import AvatarUpload from '@/features/members/components/avatar-upload';
import InlineEdit from '@/components/controls/inline-edit';
import { useDisplayNameCheck, useUpdateMember } from '@/features/members/hooks/use-member';
import { generateSlug } from '@/features/members/services/member';
import type { Member } from '@/features/members/types/member';
import { useToast } from '@/components/indicators/toast/context';
import { createClient } from '@/libs/supabase/client';
import styles from './personal-info.module.scss';

interface PersonalInfoProps {
  member: Member;
  userId: string;
}

export default function PersonalInfo({ member, userId }: PersonalInfoProps) {
  const { showToast } = useToast();
  const updateMember = useUpdateMember();

  const [draftName, setDraftName] = useState('');
  const [debouncedName, setDebouncedName] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(draftName);
    }, 400);
    return () => clearTimeout(timer);
  }, [draftName]);

  const isCurrentName = debouncedName.toLowerCase() === (member.display_name ?? '').toLowerCase();

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

  const handleFirstNameSave = async (newFirstName: string) => {
    await updateMember.mutateAsync({
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
    await updateMember.mutateAsync({
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
    await updateMember.mutateAsync({
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
    await updateMember.mutateAsync({
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
    await updateMember.mutateAsync({
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
      <div className={styles.profileHero}>
        <div className={styles.profileHeroPattern} aria-hidden="true" />
        <div className={styles.avatarSection}>
          <AvatarUpload
            displayName={member.display_name ?? ''}
            avatarUrl={member.avatar_url ?? null}
            onUpload={handleAvatarUpload}
            disabled={updateMember.isPending}
          />
        </div>
        <div className={styles.identityBlock}>
          <span className={styles.displayName}>{member.display_name || 'Set your name'}</span>
          {member.slug && <span className={styles.handle}>@{member.slug}</span>}
        </div>
      </div>

      <div className={styles.fields}>
        <div className={styles.sectionDivider}>
          <span className={styles.headingIcon} aria-hidden="true">
            <HiUser />
          </span>
          <h2 className={styles.heading}>Personal Info</h2>
        </div>

        <div className={styles.nameRow}>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>First name</span>
            <div className={styles.fieldValue}>
              <InlineEdit
                value={member.first_name ?? ''}
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
                value={member.last_name ?? ''}
                onSave={handleLastNameSave}
                placeholder="Add last name"
                ariaLabel="last name"
              />
            </div>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Display name</span>
          <div className={styles.fieldValue}>
            <InlineEdit
              value={member.display_name ?? ''}
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
          <span className={styles.fieldLabel}>Handle</span>
          <span className={styles.fieldStatic}>
            {member.slug ? `@${member.slug}` : 'Generated from display name'}
          </span>
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Bio</span>
          <div className={styles.fieldValue}>
            <InlineEdit
              value={member.bio ?? ''}
              onSave={handleBioSave}
              maxLength={280}
              multiline
              placeholder="Tell buyers and sellers about yourself"
              ariaLabel="bio"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
