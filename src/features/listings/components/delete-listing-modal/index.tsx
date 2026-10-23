'use client';

import { useId } from 'react';

import Button from '@/components/controls/button';
import Modal from '@/components/layout/modal';
import type { ListingWithPhotos } from '@/features/listings/types/listing';

import styles from './delete-listing-modal.module.scss';

interface DeleteListingModalProps {
  listing: ListingWithPhotos;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function DeleteListingModal({
  listing,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}: DeleteListingModalProps) {
  const titleId = useId();

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy={titleId}>
      <div className={styles.content}>
        <h3 id={titleId} className={styles.title}>
          Delete this listing?
        </h3>
        <p className={styles.listingTitle}>{listing.title}</p>
        <p className={styles.warning}>
          This listing will be permanently removed from your dashboard.
        </p>

        <div className={styles.actions}>
          <Button style="danger" fullWidth onClick={onConfirm} loading={loading} disabled={loading}>
            Delete
          </Button>
          <Button style="secondary" fullWidth outline onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
