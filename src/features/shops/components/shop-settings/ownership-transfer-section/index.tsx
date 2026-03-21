'use client';

import { useState } from 'react';
import { useShopMembers, useTransferOwnership } from '@/features/shops/hooks/use-shops';
import useContextStore from '@/features/context/stores/context-store';
import { useToast } from '@/components/indicators/toast/context';
import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import type { Shop } from '@/features/shops/types/shop';
import styles from './ownership-transfer-section.module.scss';

interface OwnershipTransferSectionProps {
  shop: Shop;
}

export default function OwnershipTransferSection({ shop }: OwnershipTransferSectionProps) {
  const { showToast } = useToast();
  const { data: members } = useShopMembers(shop.id);
  const transferOwnershipMutation = useTransferOwnership();

  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [showStep1Modal, setShowStep1Modal] = useState(false);
  const [showStep2Modal, setShowStep2Modal] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  const transferableCandidates = (members ?? []).filter((m) => m.member_id !== shop.owner_id);

  const handleOpenStep1 = () => {
    setShowStep1Modal(true);
  };

  const handleStep1Confirm = () => {
    setShowStep1Modal(false);
    setConfirmName('');
    setShowStep2Modal(true);
  };

  const handleStep2Cancel = () => {
    setShowStep2Modal(false);
    setConfirmName('');
  };

  const handleTransfer = async () => {
    try {
      await transferOwnershipMutation.mutateAsync({
        shopId: shop.id,
        newOwnerId: selectedMemberId,
      });
      useContextStore.getState().switchToMember();
      showToast({
        type: 'success',
        message: 'Ownership transferred',
        description: 'You are no longer the shop owner.',
      });
      setShowStep2Modal(false);
      setConfirmName('');
      setSelectedMemberId('');
    } catch {
      showToast({
        type: 'error',
        message: 'Transfer failed',
        description: 'Something went wrong. Please try again.',
      });
    }
  };

  const isConfirmNameMatch = confirmName === shop.shop_name;

  return (
    <section className={styles.card}>
      <h2 className={styles.heading}>Transfer Ownership</h2>
      <p className={styles.description}>
        Transfer ownership of this shop to another member. You will lose owner privileges
        immediately.
      </p>

      {transferableCandidates.length === 0 ? (
        <p className={styles.emptyText}>Add members to your shop before transferring ownership.</p>
      ) : (
        <div className={styles.selectRow}>
          <label htmlFor="transfer-member-select" className="sr-only">
            Select new owner
          </label>
          <select
            id="transfer-member-select"
            className={styles.select}
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
          >
            <option value="">Select a member…</option>
            {transferableCandidates.map((m) => (
              <option key={m.member_id} value={m.member_id}>
                {m.member_id} ({m.role})
              </option>
            ))}
          </select>

          <Button
            style="primary"
            onClick={handleOpenStep1}
            disabled={!selectedMemberId}
            ariaLabel="Transfer ownership"
          >
            Transfer Ownership
          </Button>
        </div>
      )}

      {/* Step 1 modal — initial confirmation */}
      <Modal
        isOpen={showStep1Modal}
        onClose={() => setShowStep1Modal(false)}
        ariaLabel="Confirm ownership transfer"
      >
        <div className={styles.modalContent}>
          <h2>Transfer shop ownership?</h2>
          <p>
            Are you sure you want to transfer ownership? You will lose owner privileges for this
            shop immediately.
          </p>
          <div className={styles.modalActions}>
            <Button style="secondary" onClick={() => setShowStep1Modal(false)}>
              Cancel
            </Button>
            <Button style="primary" onClick={handleStep1Confirm} ariaLabel="Continue transfer">
              Yes, continue
            </Button>
          </div>
        </div>
      </Modal>

      {/* Step 2 modal — name confirmation */}
      <Modal
        isOpen={showStep2Modal}
        onClose={handleStep2Cancel}
        ariaLabel="Confirm shop name to transfer"
      >
        <div className={styles.modalContent}>
          <h2>Confirm transfer</h2>
          <p id="confirm-hint" className={styles.confirmHint}>
            Type <strong>{shop.shop_name}</strong> to confirm ownership transfer.
          </p>
          <label htmlFor="confirm-name-input" className="sr-only">
            Shop name confirmation
          </label>
          <input
            id="confirm-name-input"
            className={styles.confirmInput}
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={shop.shop_name ?? ''}
            aria-describedby="confirm-hint"
            autoComplete="off"
          />
          <div className={styles.modalActions}>
            <Button
              style="secondary"
              onClick={handleStep2Cancel}
              disabled={transferOwnershipMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              style="primary"
              onClick={handleTransfer}
              disabled={!isConfirmNameMatch}
              loading={transferOwnershipMutation.isPending}
              ariaLabel="Confirm ownership transfer"
            >
              Transfer
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
