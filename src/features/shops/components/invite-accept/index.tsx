'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/features/auth/context';
import { useAcceptInvite } from '@/features/shops/hooks/use-shop-invites';
import Button from '@/components/controls/button';
import { useToast } from '@/components/indicators/toast/context';
import type { InvitePageData } from '@/features/shops/types/invite';
import styles from './invite-accept.module.scss';

interface Props {
  invite: InvitePageData;
  isAuthenticated: boolean;
}

export function InviteAccept({ invite, isAuthenticated: serverAuth }: Props) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const acceptMutation = useAcceptInvite();
  const [apiError, setApiError] = useState<string | null>(null);

  // Use client-side auth state (updates after login modal) — fall back to server prop during hydration
  const isAuthenticated = authLoading ? serverAuth : !!user;

  const handleAccept = () => {
    setApiError(null);
    acceptMutation.mutate(invite.token, {
      onSuccess: (data) => {
        showToast({
          type: 'success',
          message: `You've joined ${data.shopName}!`,
          description: 'You now have access to this shop.',
        });
        router.push('/dashboard');
      },
      onError: (err: Error & { code?: string }) => {
        const message =
          err.code === 'ALREADY_MEMBER'
            ? 'You are already a member of this shop.'
            : err.code === 'MEMBER_LIMIT_REACHED'
              ? 'This shop has reached its member limit.'
              : err.code === 'SHOP_LIMIT_REACHED'
                ? 'You have reached the maximum number of shops you can join.'
                : err.message || 'Failed to accept invitation. Please try again.';
        setApiError(message);
      },
    });
  };

  const expiryDate = new Date(invite.expiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Non-pending states
  if (invite.status === 'expired') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <h1 className={styles.errorTitle}>Invitation Expired</h1>
            <p className={styles.errorMessage}>
              This invitation has expired. Please ask the shop owner to send a new invite.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (invite.status === 'accepted') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <h1 className={styles.errorTitle}>Already Accepted</h1>
            <p className={styles.errorMessage}>This invitation has already been accepted.</p>
          </div>
        </div>
      </div>
    );
  }

  if (invite.status === 'revoked') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <h1 className={styles.errorTitle}>Invitation Revoked</h1>
            <p className={styles.errorMessage}>This invitation has been revoked.</p>
          </div>
        </div>
      </div>
    );
  }

  // Valid pending invite
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.avatarWrapper}>
          {invite.shopAvatarUrl ? (
            <Image
              src={invite.shopAvatarUrl}
              alt={invite.shopName}
              fill
              sizes="80px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <span className={styles.avatarFallback} aria-hidden="true">
              {invite.shopName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className={styles.details}>
          <h1 className={styles.shopName}>{invite.shopName}</h1>
          <p className={styles.inviteMeta}>
            <strong>{invite.inviterName}</strong> has invited you to join as{' '}
            <strong>{invite.roleName}</strong>
          </p>
          <p className={styles.expiry}>Expires {expiryDate}</p>
        </div>

        {apiError && (
          <div role="alert" aria-live="assertive" className={styles.apiError}>
            {apiError}
          </div>
        )}

        {authLoading ? (
          <div className={styles.actionSkeleton} aria-hidden="true" />
        ) : isAuthenticated ? (
          <Button onClick={handleAccept} loading={acceptMutation.isPending} fullWidth>
            Accept Invitation
          </Button>
        ) : (
          <div className={styles.unauthState}>
            <p className={styles.unauthMessage}>
              Sign in or create an account to accept this invitation
            </p>
            <Button
              onClick={() =>
                router.push(`?register=true&invite=${encodeURIComponent(invite.token)}`)
              }
              fullWidth
            >
              Sign Up
            </Button>
            <Button onClick={() => router.push('?login=true')} style="dark" outline fullWidth>
              Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
