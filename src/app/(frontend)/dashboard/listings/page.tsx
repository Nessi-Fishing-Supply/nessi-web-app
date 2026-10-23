'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Button from '@/components/controls/button';
import { useToast } from '@/components/indicators/toast/context';
import { useAuth } from '@/features/auth/context';
import {
  useSellerListings,
  useDuplicateListing,
  useUpdateListingStatus,
  useDeleteListing,
} from '@/features/listings/hooks/use-listings';
import ListingRow from '@/features/listings/components/listing-row';
import ListingActionsMenu from '@/features/listings/components/listing-actions-menu';
import MarkSoldModal from '@/features/listings/components/mark-sold-modal';
import DeleteListingModal from '@/features/listings/components/delete-listing-modal';
import QuickEditPrice from '@/features/listings/components/quick-edit-price';
import {
  DASHBOARD_STATUS_TABS,
  DASHBOARD_TAB_LABELS,
  type DashboardStatusTab,
} from '@/features/listings/constants/status';
import type { ListingWithPhotos } from '@/features/listings/types/listing';

import styles from './listings-dashboard.module.scss';

type ModalType = 'actions' | 'mark-sold' | 'delete' | 'quick-price' | null;

function filterByTab(listings: ListingWithPhotos[], tab: DashboardStatusTab): ListingWithPhotos[] {
  if (tab === 'all') return listings.filter((l) => l.status !== 'deleted');
  return listings.filter((l) => l.status === tab);
}

function getTabCount(listings: ListingWithPhotos[], tab: DashboardStatusTab): number {
  return filterByTab(listings, tab).length;
}

export default function ListingsDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardStatusTab>('all');
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [targetListing, setTargetListing] = useState<ListingWithPhotos | null>(null);

  const { data: allListings = [], isLoading } = useSellerListings();
  const duplicateListing = useDuplicateListing();
  const updateStatus = useUpdateListingStatus();
  const deleteListing = useDeleteListing();

  if (!isAuthenticated) {
    return <p>Please sign in to view your listings.</p>;
  }

  const visibleListings = filterByTab(allListings, activeTab);

  function openActions(listing: ListingWithPhotos) {
    setTargetListing(listing);
    setOpenModal('actions');
  }

  function openQuickPrice(listing: ListingWithPhotos) {
    setTargetListing(listing);
    setOpenModal('quick-price');
  }

  function closeModal() {
    setOpenModal(null);
    setTargetListing(null);
  }

  function handleDuplicate() {
    if (!targetListing) return;
    duplicateListing.mutate(targetListing.id, {
      onSuccess: (newDraft) => {
        showToast({
          type: 'success',
          message: 'Listing duplicated as draft',
          description: 'Add photos to publish.',
        });
        router.push(`/dashboard/listings/new?draftId=${newDraft.id}`);
      },
      onError: () =>
        showToast({
          type: 'error',
          message: 'Failed to duplicate',
          description: 'Please try again.',
        }),
    });
  }

  function handleDeactivate() {
    if (!targetListing) return;
    updateStatus.mutate(
      { id: targetListing.id, status: 'archived' },
      {
        onSuccess: () =>
          showToast({
            type: 'success',
            message: 'Listing deactivated',
            description: 'Hidden from public search.',
          }),
        onError: () =>
          showToast({
            type: 'error',
            message: 'Failed to deactivate',
            description: 'Please try again.',
          }),
      },
    );
  }

  function handleActivate() {
    if (!targetListing) return;
    updateStatus.mutate(
      { id: targetListing.id, status: 'active' },
      {
        onSuccess: () =>
          showToast({
            type: 'success',
            message: 'Listing activated',
            description: 'Now visible to buyers.',
          }),
        onError: () =>
          showToast({
            type: 'error',
            message: 'Failed to activate',
            description: 'Please try again.',
          }),
      },
    );
  }

  function handleMarkSold(soldPriceCents?: number) {
    if (!targetListing) return;
    updateStatus.mutate(
      { id: targetListing.id, status: 'sold', sold_price_cents: soldPriceCents },
      {
        onSuccess: () => {
          closeModal();
          showToast({
            type: 'success',
            message: 'Marked as sold',
            description: 'Congrats on the sale!',
          });
        },
        onError: () =>
          showToast({
            type: 'error',
            message: 'Failed to mark as sold',
            description: 'Please try again.',
          }),
      },
    );
  }

  function handleDelete() {
    if (!targetListing) return;
    deleteListing.mutate(targetListing.id, {
      onSuccess: () => {
        closeModal();
        showToast({
          type: 'success',
          message: 'Listing deleted',
          description: 'The listing has been removed.',
        });
      },
      onError: () =>
        showToast({ type: 'error', message: 'Failed to delete', description: 'Please try again.' }),
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>My Listings</h1>
        <Button style="primary" onClick={() => router.push('/dashboard/listings/new')}>
          Create Listing
        </Button>
      </div>

      <nav className={styles.tabs} aria-label="Listing status filter">
        <div className={styles.tabScroller}>
          {DASHBOARD_STATUS_TABS.map((tab) => {
            const count = getTabCount(allListings, tab);
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
                aria-pressed={isActive}
              >
                {DASHBOARD_TAB_LABELS[tab]}
                <span className={styles.tabCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {isLoading ? (
        <p className={styles.loading}>Loading your listings...</p>
      ) : visibleListings.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            {activeTab === 'all'
              ? "You don't have any listings yet."
              : `No ${DASHBOARD_TAB_LABELS[activeTab].toLowerCase()} listings.`}
          </p>
          {activeTab === 'all' && (
            <Button style="primary" onClick={() => router.push('/dashboard/listings/new')}>
              Create your first listing
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {visibleListings.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              onActionsClick={openActions}
              onPriceClick={openQuickPrice}
            />
          ))}
        </div>
      )}

      {/* Action modals */}
      {targetListing && openModal === 'actions' && (
        <ListingActionsMenu
          listing={targetListing}
          isOpen
          onClose={closeModal}
          onMarkSold={() => setOpenModal('mark-sold')}
          onDeactivate={handleDeactivate}
          onActivate={handleActivate}
          onDuplicate={handleDuplicate}
          onDelete={() => setOpenModal('delete')}
        />
      )}

      {targetListing && openModal === 'mark-sold' && (
        <MarkSoldModal
          listing={targetListing}
          isOpen
          onClose={closeModal}
          onConfirm={handleMarkSold}
          loading={updateStatus.isPending}
        />
      )}

      {targetListing && openModal === 'delete' && (
        <DeleteListingModal
          listing={targetListing}
          isOpen
          onClose={closeModal}
          onConfirm={handleDelete}
          loading={deleteListing.isPending}
        />
      )}

      {targetListing && openModal === 'quick-price' && (
        <QuickEditPrice listing={targetListing} isOpen onClose={closeModal} />
      )}
    </div>
  );
}
