'use client';

import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import styles from './custom-role-upsell-modal.module.scss';

interface CustomRoleUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomRoleUpsellModal({ isOpen, onClose }: CustomRoleUpsellModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Custom roles premium upsell">
      <div className={styles.content}>
        <h2 className={styles.heading}>Custom Roles</h2>
        <p className={styles.description}>
          Custom roles are available on the Premium plan. Upgrade your shop to create roles with
          tailored permissions for your team.
        </p>
        <div className={styles.actions}>
          <Button style="secondary" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </Modal>
  );
}
