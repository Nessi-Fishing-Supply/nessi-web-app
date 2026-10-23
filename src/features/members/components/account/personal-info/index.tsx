'use client';

import { useState } from 'react';
import { HiUser } from 'react-icons/hi';
import AvatarUpload from '@/components/controls/avatar-upload';
import InlineEdit from '@/components/controls/inline-edit';
import Modal from '@/components/layout/modal';
import ChangeEmailForm from '@/features/auth/components/change-email-form';
import { useAuth } from '@/features/auth/context';
import { useUpdateMember } from '@/features/members/hooks/use-member';
import type { Member } from '@/features/members/types/member';
import { useToast } from '@/components/indicators/toast/context';
import { createClient } from '@/libs/supabase/client';
import { formatMemberName } from '@/features/members/utils/format-name';
import styles from './personal-info.module.scss';

interface PersonalInfoProps {
  member: Member;
  userId: string;
}

export default function PersonalInfo({ member, userId }: PersonalInfoProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const updateMember = useUpdateMember();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const currentEmail = user?.email ?? '';

  const handleEmailChangeSuccess = () => {
    setIsEmailModalOpen(false);
    showToast({
      message: 'Email updated',
      description: 'Your email address has been changed.',
      type: 'success',
      duration: 3000,
    });
  };

  const fullName = formatMemberName(member.first_name ?? '', member.last_name ?? '');

  const handleFirstNameSave = async (newFirstName: string) => {
    if (!newFirstName.trim()) return;
    await updateMember.mutateAsync({
      userId,
      data: { first_name: newFirstName.trim() },
    });
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { firstName: newFirstName.trim() },
    });
    showToast({
      message: 'Saved',
      description: 'Your first name has been updated.',
      type: 'success',
      duration: 2000,
    });
  };

  const handleLastNameSave = async (newLastName: string) => {
    if (!newLastName.trim()) return;
    await updateMember.mutateAsync({
      userId,
      data: { last_name: newLastName.trim() },
    });
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { lastName: newLastName.trim() },
    });
    showToast({
      message: 'Saved',
      description: 'Your last name has been updated.',
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
            name={fullName}
            avatarUrl={member.avatar_url ?? null}
            onUpload={handleAvatarUpload}
            disabled={updateMember.isPending}
          />
        </div>
        <div className={styles.identityBlock}>
          <span className={styles.displayName}>{fullName.trim() || 'Set your name'}</span>
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
          <span className={styles.fieldLabel}>Handle</span>
          <span className={styles.fieldStatic}>
            {member.slug ? `@${member.slug}` : 'Generated from your name'}
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

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Email</span>
          <div className={styles.emailRow}>
            <span className={styles.emailValue}>{currentEmail}</span>
            <button
              type="button"
              className={styles.changeLink}
              onClick={() => setIsEmailModalOpen(true)}
            >
              Change
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        ariaLabel="Change email address"
      >
        <ChangeEmailForm currentEmail={currentEmail} onSuccess={handleEmailChangeSuccess} />
      </Modal>
    </section>
  );
}
