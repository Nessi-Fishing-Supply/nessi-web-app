'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAcceptOwnershipTransfer } from '@/features/shops/hooks/use-ownership-transfer';
import Button from '@/components/controls/button';
import { useToast } from '@/components/indicators/toast/context';
import type { TransferAcceptData } from '@/features/shops/types/shop';
import styles from './transfer-accept.module.scss';

interface Props {
  transfer: TransferAcceptData;
}

export default function TransferAccept({ transfer }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const acceptMutation = useAcceptOwnershipTransfer();
  const [apiError, setApiError] = useState<string | null>(null);

  const handleAccept = () => {
    setApiError(null);
    acceptMutation.mutate(transfer.token, {
      onSuccess: (data) => {
        showToast({
          type: 'success',
          message: `You are now the owner of ${data.shopName}!`,
          description: 'Head to your dashboard to manage the shop.',
        });
        router.push('/dashboard');
      },
      onError: (err: Error) => {
        setApiError(err.message || 'Failed to accept ownership transfer. Please try again.');
      },
    });
  };

  const expiryDate = new Date(transfer.expiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (transfer.status === 'expired') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <h1 className={styles.errorTitle}>Transfer Expired</h1>
            <p className={styles.errorMessage}>
              This ownership transfer request has expired. Please ask the current owner to send a
              new request.
            </p>
            <Button onClick={() => router.push('/dashboard')} style="dark" outline>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.details}>
          <h1 className={styles.shopName}>{transfer.shopName}</h1>
          <p className={styles.inviteMeta}>
            <strong>{transfer.fromMemberName}</strong> has invited you to become the owner of this
            shop
          </p>
          <p className={styles.expiry}>Expires on {expiryDate}</p>
        </div>

        {apiError && (
          <div role="alert" aria-live="assertive" className={styles.apiError}>
            {apiError}
          </div>
        )}

        <div className={styles.actions}>
          <Button onClick={handleAccept} loading={acceptMutation.isPending} fullWidth>
            Accept Ownership
          </Button>
          <Button onClick={() => router.push('/dashboard')} style="dark" outline fullWidth>
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
