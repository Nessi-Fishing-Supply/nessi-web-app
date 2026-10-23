'use client';

import { useState } from 'react';
import Pill from '@/components/indicators/pill';
import Button from '@/components/controls/button';
import type { Address } from '@/features/addresses/types/address';
import styles from './address-card.module.scss';

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (addressId: string) => void;
  onSetDefault: (addressId: string) => void;
  isDeleting?: boolean;
  isSettingDefault?: boolean;
}

export default function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting = false,
  isSettingDefault = false,
}: AddressCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = () => {
    onDelete(address.id);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.label}>{address.label}</h3>
        {address.is_default && <Pill color="primary">Default</Pill>}
      </div>

      <address className={styles.addressLines}>
        <span>{address.line1}</span>
        {address.line2 && <span>{address.line2}</span>}
        <span>
          {address.city}, {address.state} {address.zip}
        </span>
      </address>

      <div className={styles.actions}>
        {showDeleteConfirm ? (
          <div className={styles.deleteConfirm}>
            <span className={styles.confirmText}>Are you sure?</span>
            <div className={styles.confirmButtons}>
              <Button
                style="secondary"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                ariaLabel="Cancel delete"
              >
                Cancel
              </Button>
              <Button
                style="danger"
                onClick={handleConfirmDelete}
                loading={isDeleting}
                ariaLabel={`Confirm delete ${address.label} address`}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button
              style="secondary"
              onClick={() => onEdit(address)}
              ariaLabel={`Edit ${address.label} address`}
            >
              Edit
            </Button>
            <Button
              style="danger"
              onClick={handleDeleteClick}
              ariaLabel={`Delete ${address.label} address`}
            >
              Delete
            </Button>
            {!address.is_default && (
              <Button
                style="secondary"
                onClick={() => onSetDefault(address.id)}
                loading={isSettingDefault}
                ariaLabel={`Set ${address.label} as default address`}
              >
                Set as Default
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
