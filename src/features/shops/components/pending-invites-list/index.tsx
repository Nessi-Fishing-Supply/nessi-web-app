'use client';

import { useState } from 'react';
import { useToast } from '@/components/indicators/toast/context';
import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import Pill from '@/components/indicators/pill';
import { useResendInvite, useRevokeInvite } from '@/features/shops/hooks/use-shop-invites';
import { getRelativeTime } from '@/features/shops/utils/get-relative-time';
import type { ShopInviteWithInviter } from '@/features/shops/types/invite';
import type { ShopRole } from '@/features/shops/types/permissions';
import styles from './pending-invites-list.module.scss';

interface PendingInvitesListProps {
  invites: ShopInviteWithInviter[];
  roles: ShopRole[];
  shopId: string;
  isOwner: boolean;
  isLoading?: boolean;
  isError?: boolean;
}

function getRoleLabel(roleId: string, roles: ShopRole[]): string {
  const role = roles.find((r) => r.id === roleId);
  return role?.name ?? 'Contributor';
}

function getStatusPillColor(
  status: string,
  isExpired: boolean,
): 'warning' | 'default' | 'error' | 'success' {
  if (isExpired) return 'default';
  switch (status) {
    case 'pending':
      return 'warning';
    case 'accepted':
      return 'success';
    case 'revoked':
      return 'error';
    default:
      return 'default';
  }
}

export default function PendingInvitesList({
  invites,
  roles,
  shopId,
  isOwner,
  isLoading,
  isError,
}: PendingInvitesListProps) {
  const { showToast } = useToast();
  const resendInvite = useResendInvite();
  const revokeInvite = useRevokeInvite();
  const [revokeTarget, setRevokeTarget] = useState<ShopInviteWithInviter | null>(null);

  const handleResend = (invite: ShopInviteWithInviter) => {
    resendInvite.mutate(
      { shopId, inviteId: invite.id },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            message: 'Invitation resent',
            description: `A new invite has been sent to ${invite.email}.`,
          });
        },
        onError: () => {
          showToast({
            type: 'error',
            message: 'Failed to resend invitation',
            description: 'Something went wrong. Please try again.',
          });
        },
      },
    );
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    const target = revokeTarget;
    setRevokeTarget(null);

    revokeInvite.mutate(
      { shopId, inviteId: target.id },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            message: 'Invitation revoked',
            description: `The invitation to ${target.email} has been revoked.`,
          });
        },
        onError: () => {
          showToast({
            type: 'error',
            message: 'Failed to revoke invitation',
            description: 'Something went wrong. Please try again.',
          });
        },
      },
    );
  };

  return (
    <section className={styles.card} aria-labelledby="pending-invites-heading">
      <h2 id="pending-invites-heading" className={styles.heading}>
        Pending Invitations
      </h2>

      {isLoading && (
        <p className={styles.stateMessage} role="status" aria-live="polite">
          Loading invitations…
        </p>
      )}

      {isError && (
        <p className={styles.stateMessage} role="alert" aria-live="assertive">
          Failed to load invitations. Please refresh and try again.
        </p>
      )}

      {!isLoading && !isError && invites.length === 0 && (
        <p className={styles.stateMessage}>No invitations sent yet.</p>
      )}

      {!isLoading && !isError && invites.length > 0 && (
        <ul className={styles.inviteList} aria-label="Pending invitations">
          {invites.map((invite) => {
            const isExpired =
              invite.status !== 'accepted' &&
              invite.status !== 'revoked' &&
              new Date(invite.expires_at) < new Date();
            const effectiveStatus = isExpired ? 'expired' : invite.status;
            const roleLabel = getRoleLabel(invite.role_id, roles);
            const pillColor = getStatusPillColor(invite.status, isExpired);
            const isActionable = invite.status === 'pending' && !isExpired;

            return (
              <li key={invite.id} className={styles.inviteRow}>
                <div className={styles.inviteInfo}>
                  <span className={styles.inviteEmail}>{invite.email}</span>
                  <div className={styles.inviteMeta}>
                    <Pill color="secondary">{roleLabel}</Pill>
                    <Pill color={pillColor}>
                      {effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
                    </Pill>
                    <span className={styles.inviteTime}>
                      Sent {getRelativeTime(invite.created_at)}
                    </span>
                  </div>
                </div>

                {isOwner && (
                  <div className={styles.inviteActions}>
                    <Button
                      style="secondary"
                      onClick={() => handleResend(invite)}
                      disabled={!isActionable || resendInvite.isPending}
                      loading={
                        resendInvite.isPending && resendInvite.variables?.inviteId === invite.id
                      }
                      ariaLabel={`Resend invitation to ${invite.email}`}
                    >
                      Resend
                    </Button>
                    <Button
                      style="danger"
                      onClick={() => setRevokeTarget(invite)}
                      disabled={
                        invite.status === 'revoked' ||
                        invite.status === 'accepted' ||
                        revokeInvite.isPending
                      }
                      ariaLabel={`Revoke invitation to ${invite.email}`}
                    >
                      Revoke
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        isOpen={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        ariaLabel="Confirm revoke invitation"
      >
        {revokeTarget !== null && (
          <div className={styles.confirmModal}>
            <h3 className={styles.confirmTitle}>Revoke invitation?</h3>
            <p className={styles.confirmMessage}>
              Are you sure you want to revoke the invitation to{' '}
              <strong>{revokeTarget.email}</strong>? They will no longer be able to join this shop
              using this invite link.
            </p>
            <div className={styles.confirmActions}>
              <Button style="secondary" onClick={() => setRevokeTarget(null)}>
                Cancel
              </Button>
              <Button style="danger" onClick={handleRevoke} loading={revokeInvite.isPending}>
                Revoke Invitation
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
