'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDeleteShop } from '@/features/shops/hooks/use-shops';
import useContextStore from '@/features/context/stores/context-store';
import { useToast } from '@/components/indicators/toast/context';
import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import type { Shop } from '@/features/shops/types/shop';
import styles from './shop-deletion-section.module.scss';

interface ShopDeletionSectionProps {
  shop: Shop;
}

export default function ShopDeletionSection({ shop }: ShopDeletionSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const deleteShopMutation = useDeleteShop();

  const [isModalOpen, setModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteShopMutation.mutateAsync(shop.id);
      useContextStore.getState().switchToMember();
      showToast({
        type: 'success',
        message: 'Shop deleted',
        description: `${shop.shop_name} has been deleted.`,
      });
      router.push('/dashboard');
    } catch {
      setIsDeleting(false);
      setModalOpen(false);
      showToast({
        type: 'error',
        message: 'Failed to delete shop',
        description: 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <>
      <section className={styles.dangerZone}>
        <h2 className={styles.heading}>Delete Shop</h2>
        <p className={styles.description}>
          Permanently delete this shop, all its products, and associated data. This action cannot be
          undone.
        </p>
        <Button style="primary" onClick={() => setModalOpen(true)} ariaLabel="Delete shop">
          Delete Shop
        </Button>
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isDeleting && setModalOpen(false)}
        ariaLabel="Confirm shop deletion"
      >
        <div className={styles.modalContent}>
          <h2>Delete {shop.shop_name}?</h2>
          <p>
            This will permanently delete your shop and all associated data. This cannot be undone.
          </p>
          <p className={styles.confirmHint} id="confirm-hint">
            Type <strong>{shop.shop_name}</strong> to confirm.
          </p>
          <input
            type="text"
            className={styles.confirmInput}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={shop.shop_name}
            aria-describedby="confirm-hint"
            aria-label="Type shop name to confirm deletion"
            disabled={isDeleting}
          />
          <div className={styles.modalActions}>
            <Button style="secondary" onClick={() => setModalOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              style="primary"
              onClick={handleDelete}
              loading={isDeleting}
              disabled={confirmName !== shop.shop_name}
              ariaLabel="Confirm delete shop"
            >
              Yes, delete this shop
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
