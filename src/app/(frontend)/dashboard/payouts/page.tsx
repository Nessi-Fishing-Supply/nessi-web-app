'use client';

import { useAuth } from '@/features/auth/context';
import { useMember } from '@/features/members/hooks/use-member';
import PendingBalance from '@/features/orders/components/pending-balance';
import AvailableBalance from '@/features/orders/components/available-balance';
import PayoutHistory from '@/features/orders/components/payout-history';
import styles from './payouts-page.module.scss';

export default function PayoutsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? '';
  const { data: member, isLoading: memberLoading } = useMember(userId, !!userId);

  const isLoading = authLoading || memberLoading;
  const isConnected = !!member?.is_stripe_connected;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Payouts</h1>
        <p className={styles.loading}>Loading...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Payouts</h1>
        <div className={styles.onboardingCard}>
          <h2 className={styles.onboardingTitle}>Connect your Stripe account</h2>
          <p className={styles.onboardingText}>
            To receive payouts, you need to complete Stripe Connect onboarding. This lets us
            securely transfer funds from your sales directly to your bank account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Payouts</h1>

      <div className={styles.balanceRow}>
        <PendingBalance />
        <AvailableBalance />
      </div>

      <PayoutHistory />
    </div>
  );
}
