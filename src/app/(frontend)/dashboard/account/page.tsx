'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/context';
import { useMember } from '@/features/members/hooks/use-member';
import { logout } from '@/features/auth/services/auth';
import { useToast } from '@/components/indicators/toast/context';
import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import MemberCompleteness from '@/features/members/components/member-completeness';
import PersonalInfo from '@/features/members/components/account/personal-info';
import FishingIdentity from '@/features/members/components/account/fishing-identity';
import Notifications from '@/features/members/components/account/notifications';
import LinkedAccounts from '@/features/members/components/account/linked-accounts';
import SellerSettings from '@/features/members/components/account/seller-settings';
import type { Member } from '@/features/members/types/member';
import styles from './account.module.scss';

export default function Account() {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? '';
  const { data: member, isLoading: memberLoading, isError, refetch } = useMember(userId, !!userId);
  const { showToast } = useToast();
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [ownedShops, setOwnedShops] = useState<Array<{ id: string; shop_name: string }> | null>(
    null,
  );

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

      if (response.status === 409) {
        const data = await response.json();
        setOwnedShops(data.shops);
        setIsDeleting(false);
        return;
      }

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

  if (authLoading || memberLoading) {
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

      {member && <MemberCompleteness member={member as Member} />}

      <div className={styles.sections}>
        {member && <PersonalInfo member={member as Member} userId={userId} />}
        {member && <FishingIdentity member={member as Member} userId={userId} />}
        {member && <Notifications member={member as Member} userId={userId} />}
        {member && <SellerSettings member={member as Member} userId={userId} />}
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
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false);
            setOwnedShops(null);
          }
        }}
        ariaLabel="Confirm account deletion"
      >
        {ownedShops !== null ? (
          <div className={styles.shopWarning}>
            <h2 className={styles.shopWarningHeading}>You own shops</h2>
            <p>Transfer or delete your shops before deleting your account.</p>
            <ul className={styles.shopList}>
              {ownedShops.map((shop) => (
                <li key={shop.id}>
                  <Link
                    href="/dashboard/shop/settings"
                    className={styles.shopLink}
                    aria-label={`Go to ${shop.shop_name} settings`}
                  >
                    {shop.shop_name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className={styles.deleteActions}>
              <Button
                style="secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setOwnedShops(null);
                }}
              >
                Got it
              </Button>
            </div>
          </div>
        ) : (
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
        )}
      </Modal>
    </div>
  );
}
