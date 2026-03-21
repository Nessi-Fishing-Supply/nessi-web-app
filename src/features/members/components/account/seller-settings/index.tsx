'use client';

import { useToast } from '@/components/indicators/toast/context';
import CollapsibleCard from '@/components/layout/collapsible-card';
import { useUpdateMember } from '@/features/members/hooks/use-member';
import type { Member } from '@/features/members/types/member';

import styles from './seller-settings.module.scss';

interface SellerSettingsProps {
  member: Member;
  userId: string;
}

export default function SellerSettings({ member, userId }: SellerSettingsProps) {
  const { showToast } = useToast();
  const updateMember = useUpdateMember();

  const handleToggle = async (value: boolean) => {
    try {
      await updateMember.mutateAsync({
        userId,
        data: { is_seller: value },
      });

      showToast({
        message: 'Saved',
        description: value ? 'Seller mode enabled' : 'Seller mode disabled',
        type: 'success',
        duration: 2000,
      });
    } catch {
      showToast({
        message: 'Something went wrong',
        description: 'Could not save your preferences. Please try again.',
        type: 'error',
      });
    }
  };

  return (
    <CollapsibleCard title="Seller Settings">
      <div className={styles.item}>
        <label htmlFor="seller-toggle" className={styles.label}>
          <span className={styles.labelText}>Enable selling on your profile</span>
          <span className={styles.description}>
            Allow buyers to discover your listings and shop
          </span>
        </label>
        <div className={styles.toggleWrapper}>
          <input
            id="seller-toggle"
            type="checkbox"
            role="switch"
            className={styles.toggle}
            checked={member.is_seller ?? false}
            aria-checked={member.is_seller ?? false}
            disabled={updateMember.isPending}
            onChange={(e) => handleToggle(e.target.checked)}
          />
        </div>
      </div>

      {member.is_seller && (
        <p className={styles.warning}>
          Turning off seller mode will hide your listings from public view. You can turn it back on
          anytime.
        </p>
      )}

      <p className={styles.guardText} aria-disabled="true">
        Active orders and published listings will need to be resolved before disabling seller mode.
      </p>
    </CollapsibleCard>
  );
}
