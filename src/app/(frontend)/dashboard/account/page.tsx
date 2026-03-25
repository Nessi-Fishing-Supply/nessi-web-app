'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HiExternalLink } from 'react-icons/hi';
import { useAuth } from '@/features/auth/context';
import { useMember } from '@/features/members/hooks/use-member';
import { logout } from '@/features/auth/services/auth';
import { GiAnglerFish } from 'react-icons/gi';
import { useToast } from '@/components/indicators/toast/context';
import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import MemberCompleteness from '@/features/members/components/member-completeness';
import PersonalInfo from '@/features/members/components/account/personal-info';
import FishingIdentity from '@/features/members/components/account/fishing-identity';
import Notifications from '@/features/members/components/account/notifications';
import LinkedAccounts from '@/features/members/components/account/linked-accounts';
import SellerSettings from '@/features/members/components/account/seller-settings';
import AddressList from '@/features/addresses/components/address-list';
import type { Member } from '@/features/members/types/member';
import styles from './account.module.scss';

export default function Account() {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? '';
  const { data: member, isLoading: memberLoading, isError, refetch } = useMember(userId, !!userId);
  const { showToast } = useToast();
  const [isDangerOpen, setDangerOpen] = useState(false);
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
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>Your Account</h1>
            <p className={styles.heroSubtitle}>Manage your profile, preferences, and identity</p>
            {member?.slug && (
              <Link href={`/member/${member.slug}`} className={styles.viewProfile}>
                View public profile <HiExternalLink aria-hidden="true" />
              </Link>
            )}
          </div>
          <span className={styles.heroIcon} aria-hidden="true">
            <GiAnglerFish />
          </span>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.profileCard}>
            {member && <PersonalInfo member={member as Member} userId={userId} />}
          </div>

          {member && (
            <div className={styles.completenessCard}>
              <MemberCompleteness member={member as Member} />
            </div>
          )}

          <div className={styles.sidebarFooter}>
            <div className={styles.footerActions}>
              <Button style="secondary" onClick={handleLogout}>
                Log out
              </Button>
              <button
                className={styles.deleteLink}
                onClick={() => setDangerOpen(!isDangerOpen)}
                aria-expanded={isDangerOpen}
              >
                Delete Account
              </button>
            </div>

            <div className={`${styles.dangerPanel} ${isDangerOpen ? styles.dangerPanelOpen : ''}`}>
              <div className={styles.dangerPanelInner}>
                <p className={styles.dangerText}>
                  Permanently delete your account and all associated data including your profile,
                  listings, and images. This action cannot be undone.
                </p>
                <Button
                  style="danger"
                  onClick={() => setDeleteModalOpen(true)}
                  ariaLabel="Delete account"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <main className={styles.main}>
          <div className={styles.sections}>
            <div className={styles.sectionItem}>
              {member && <FishingIdentity member={member as Member} userId={userId} />}
            </div>
            <div className={styles.sectionItem}>
              {member && <Notifications member={member as Member} userId={userId} />}
            </div>
            <div className={styles.sectionItem}>
              <AddressList />
            </div>
            <div className={styles.sectionItem}>
              {member && <SellerSettings member={member as Member} />}
            </div>
            <div className={styles.sectionItem}>
              <LinkedAccounts />
            </div>
          </div>
        </main>
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
