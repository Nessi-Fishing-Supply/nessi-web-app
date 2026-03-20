'use client';

import React, { useState } from 'react';
import { useAuth } from '@/features/auth/context';
import { logout } from '@/features/auth/services/auth';
import { useToast } from '@/components/indicators/toast/context';
import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import styles from './account.module.scss';

const Account: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
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

  const firstName = user?.user_metadata?.firstName ?? '';
  const lastName = user?.user_metadata?.lastName ?? '';
  const email = user?.email ?? '';
  const emailVerified = user?.email_confirmed_at ? 'Yes' : 'No';
  const userId = user?.id ?? '';

  return (
    <div>
      <h1>Account</h1>
      {isLoading ? (
        <p>Loading user profile...</p>
      ) : isAuthenticated && user ? (
        <div>
          <h2>User Profile</h2>
          <p>User ID: {userId}</p>
          <p>First Name: {firstName}</p>
          <p>Last Name: {lastName}</p>
          <p>Email: {email}</p>
          <p>Email Verified: {emailVerified}</p>
          <button onClick={handleLogout}>Logout</button>

          <div className={styles.dangerZone}>
            <h3>Danger Zone</h3>
            <p>
              Permanently delete your account and all associated data including your profile,
              listings, and images. This action cannot be undone.
            </p>
            <Button style="primary" onClick={() => setDeleteModalOpen(true)} ariaLabel="Delete account">
              Delete Account
            </Button>
          </div>
        </div>
      ) : (
        <p>Please log in to see your profile.</p>
      )}

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
};

export default Account;
