'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/context';
import { useProfile } from '@/features/profiles/hooks/use-profile';
import { logout } from '@/features/auth/services/auth';
import { useToast } from '@/components/indicators/toast/context';
import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import ProfileCompleteness from '@/features/profiles/components/profile-completeness';
import PersonalInfo from '@/features/profiles/components/account/personal-info';
import FishingIdentity from '@/features/profiles/components/account/fishing-identity';
import Notifications from '@/features/profiles/components/account/notifications';
import LinkedAccounts from '@/features/profiles/components/account/linked-accounts';
import type { Profile } from '@/features/profiles/types/profile';
import styles from './account.module.scss';

export default function Account() {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? '';
  const {
    data: profile,
    isLoading: profileLoading,
    isError,
    refetch,
  } = useProfile(userId, !!userId);
  const { showToast } = useToast();
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch {
      // Logout failed silently — user stays on page
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/auth/delete-account', { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      await logout();
      window.location.href = '/?account_deleted=true';
    } catch {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      showToast({
        type: 'error',
        message: 'Failed to delete account',
        description: 'Something went wrong. Please try again or contact support.',
      });
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className={styles.page}>
        <p>Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <p>Failed to load your profile. Please refresh the page and try again.</p>
        <Button style="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Account</h1>

      {profile && <ProfileCompleteness profile={profile as Profile} />}

      <div className={styles.sections}>
        {profile && <PersonalInfo profile={profile as Profile} userId={userId} />}
        {profile && <FishingIdentity profile={profile as Profile} userId={userId} />}
        {profile && <Notifications profile={profile as Profile} userId={userId} />}
        <LinkedAccounts />
      </div>

      <div className={styles.logoutSection}>
        <Button style="secondary" onClick={handleLogout}>
          Log out
        </Button>
      </div>

      <div className={styles.dangerZone}>
        <h3>Danger Zone</h3>
        <p>
          Permanently delete your account and all associated data including your profile, listings,
          and images. This action cannot be undone.
        </p>
        <Button style="primary" onClick={() => setDeleteModalOpen(true)} ariaLabel="Delete account">
          Delete Account
        </Button>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        ariaLabel="Confirm account deletion"
      >
        <div className={styles.deleteModal}>
          <h2>Delete your account?</h2>
          <p>
            This will permanently delete your account, profile, listings, and all uploaded images.
            This cannot be undone.
          </p>
          <div className={styles.deleteActions}>
            <Button
              style="secondary"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              style="primary"
              onClick={handleDeleteAccount}
              loading={isDeleting}
              ariaLabel="Confirm delete account"
            >
              Yes, delete my account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
