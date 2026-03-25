'use client';

import { useState } from 'react';
import CollapsibleCard from '@/components/layout/collapsible-card';
import Button from '@/components/controls/button';
import { useToast } from '@/components/indicators/toast/context';
import AddressCard from '@/features/addresses/components/address-card';
import AddressFormModal from '@/features/addresses/components/address-form-modal';
import {
  useAddresses,
  useDeleteAddress,
  useSetDefaultAddress,
} from '@/features/addresses/hooks/use-addresses';
import { MAX_ADDRESSES } from '@/features/addresses/types/address';
import type { Address } from '@/features/addresses/types/address';

import styles from './address-list.module.scss';

export default function AddressList() {
  const { showToast } = useToast();
  const { data: addresses = [] } = useAddresses();
  const deleteAddress = useDeleteAddress();
  const setDefaultAddress = useSetDefaultAddress();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const atCap = addresses.length >= MAX_ADDRESSES;

  const handleAdd = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingAddress(null);
  };

  const handleDelete = async (addressId: string) => {
    try {
      await deleteAddress.mutateAsync(addressId);
      showToast({
        message: 'Address removed',
        description: 'Your address has been deleted.',
        type: 'success',
        duration: 3000,
      });
    } catch {
      showToast({
        message: 'Something went wrong',
        description: 'Could not delete the address. Please try again.',
        type: 'error',
      });
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultAddress.mutateAsync(addressId);
      showToast({
        message: 'Default updated',
        description: 'Your default address has been updated.',
        type: 'success',
        duration: 3000,
      });
    } catch {
      showToast({
        message: 'Something went wrong',
        description: 'Could not update the default address. Please try again.',
        type: 'error',
      });
    }
  };

  return (
    <CollapsibleCard title="Shipping Addresses">
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <Button
            style="primary"
            onClick={handleAdd}
            disabled={atCap}
            ariaLabel="Add a new address"
          >
            Add address
          </Button>
          {addresses.length > 0 && (
            <span className={styles.count}>
              {addresses.length} of {MAX_ADDRESSES} addresses saved
            </span>
          )}
          {atCap && (
            <span className={styles.capNote}>
              You&apos;ve reached the {MAX_ADDRESSES}-address limit.
            </span>
          )}
        </div>

        {addresses.length === 0 ? (
          <p className={styles.empty}>No saved addresses yet</p>
        ) : (
          <ul className={styles.list}>
            {addresses.map((address) => (
              <li key={address.id}>
                <AddressCard
                  address={address}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSetDefault={handleSetDefault}
                  isDeleting={deleteAddress.isPending}
                  isSettingDefault={setDefaultAddress.isPending}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddressFormModal isOpen={isModalOpen} onClose={handleModalClose} address={editingAddress} />
    </CollapsibleCard>
  );
}
