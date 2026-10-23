'use client';

import { useId } from 'react';
import { useRouter } from 'next/navigation';

import Modal from '@/components/layout/modal';
import type { ListingWithPhotos, ListingStatus } from '@/features/listings/types/listing';

import styles from './listing-actions-menu.module.scss';

interface ListingActionsMenuProps {
  listing: ListingWithPhotos;
  isOpen: boolean;
  onClose: () => void;
  onMarkSold: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

interface ActionItem {
  label: string;
  onClick: () => void;
  variant?: 'danger';
}

export default function ListingActionsMenu({
  listing,
  isOpen,
  onClose,
  onMarkSold,
  onDeactivate,
  onActivate,
  onDuplicate,
  onDelete,
}: ListingActionsMenuProps) {
  const router = useRouter();
  const titleId = useId();
  const status = listing.status as ListingStatus;

  function handleEdit() {
    onClose();
    if (status === 'draft') {
      router.push(`/dashboard/listings/new?draftId=${listing.id}`);
    } else {
      router.push(`/dashboard/listings/${listing.id}/edit`);
    }
  }

  function handleAction(action: () => void) {
    onClose();
    action();
  }

  function handleViewListing() {
    onClose();
    router.push(`/listing/${listing.id}`);
  }

  const actions: ActionItem[] = [];

  if (status === 'active' || status === 'sold') {
    actions.push({ label: 'View listing', onClick: handleViewListing });
  }

  actions.push({ label: 'Edit', onClick: handleEdit });

  if (status === 'active' || status === 'sold' || status === 'archived') {
    actions.push({ label: 'Duplicate', onClick: () => handleAction(onDuplicate) });
  }

  if (status === 'active') {
    actions.push({ label: 'Mark as Sold', onClick: () => handleAction(onMarkSold) });
    actions.push({ label: 'Deactivate', onClick: () => handleAction(onDeactivate) });
  }

  if (status === 'archived') {
    actions.push({ label: 'Activate', onClick: () => handleAction(onActivate) });
  }

  actions.push({ label: 'Delete', onClick: () => handleAction(onDelete), variant: 'danger' });

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy={titleId}>
      <h3 id={titleId} className={styles.title}>
        {listing.title}
      </h3>
      <ul className={styles.actionList} role="list">
        {actions.map((action) => (
          <li key={action.label}>
            <button
              type="button"
              className={`${styles.actionButton} ${action.variant === 'danger' ? styles.actionDanger : ''}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
