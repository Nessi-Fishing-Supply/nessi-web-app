'use client';

import { useToast } from '@/components/indicators/toast/context';
import CollapsibleCard from '@/components/layout/collapsible-card';
import Toggle from '@/components/controls/toggle';
import { useSellerPreconditions, useToggleSeller } from '@/features/members/hooks/use-seller';
import type { Member } from '@/features/members/types/member';

import styles from './seller-settings.module.scss';

interface SellerSettingsProps {
  member: Member;
}

export default function SellerSettings({ member }: SellerSettingsProps) {
  const { showToast } = useToast();
  const { data: preconditions } = useSellerPreconditions(member.is_seller ?? false);
  const toggleSeller = useToggleSeller();

  const isSeller = member.is_seller ?? false;
  const canToggleOff = preconditions?.canDisable ?? true;
  const isToggleDisabled = toggleSeller.isPending || (isSeller && !canToggleOff);

  const handleToggle = async (value: boolean) => {
    try {
      await toggleSeller.mutateAsync(value);

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

  const getToggleAriaLabel = () => {
    if (isSeller && !canToggleOff) {
      const parts = [];
      if (preconditions?.activeListingsCount) {
        parts.push(
          `${preconditions.activeListingsCount} active listing${preconditions.activeListingsCount === 1 ? '' : 's'} must be closed first`,
        );
      }
      if (preconditions?.activeOrdersCount) {
        parts.push(
          `${preconditions.activeOrdersCount} active order${preconditions.activeOrdersCount === 1 ? '' : 's'} must be completed first`,
        );
      }
      return `Enable selling - disabled: ${parts.join(', ')}`;
    }
    return undefined;
  };

  return (
    <CollapsibleCard title="Seller Settings">
      <div className={styles.item}>
        <div className={styles.label}>
          <span className={styles.labelText}>Enable selling on your profile</span>
          <span className={styles.description}>
            Allow buyers to discover your listings and shop
          </span>
        </div>
        <Toggle
          id="seller-toggle"
          checked={isSeller}
          onChange={handleToggle}
          disabled={isToggleDisabled}
          ariaLabel={getToggleAriaLabel()}
        />
      </div>

      {isSeller && canToggleOff && (
        <p className={styles.warning}>
          Turning off seller mode will hide your listings from public view. You can turn it back on
          anytime.
        </p>
      )}

      {isSeller && !canToggleOff && (
        <div className={styles.preconditionMessage} role="status" aria-live="polite">
          {preconditions?.activeListingsCount ? (
            <p>
              You have {preconditions.activeListingsCount} active{' '}
              {preconditions.activeListingsCount === 1 ? 'listing' : 'listings'} that must be closed
              before disabling seller mode.
            </p>
          ) : null}
          {preconditions?.activeOrdersCount ? (
            <p>
              You have {preconditions.activeOrdersCount} active{' '}
              {preconditions.activeOrdersCount === 1 ? 'order' : 'orders'} that must be completed
              first.
            </p>
          ) : null}
        </div>
      )}
    </CollapsibleCard>
  );
}
