'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import RoleSelect from '@/features/shops/components/role-select';
import { useCreateInvite } from '@/features/shops/hooks/use-shop-invites';
import { validateInviteInput } from '@/features/shops/validations/invite';
import { DEFAULT_ROLE_ID } from '@/features/shops/constants/roles';
import type { ShopRole } from '@/features/shops/types/permissions';
import styles from './invite-member-modal.module.scss';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  roles: ShopRole[];
  onSuccess: () => void;
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  shopId,
  roles,
  onSuccess,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<string>(DEFAULT_ROLE_ID);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const createInvite = useCreateInvite();

  // Reset form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setRoleId(DEFAULT_ROLE_ID);
      setFieldError(null);
      setApiError(null);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    setApiError(null);

    const validationError = validateInviteInput({ email, roleId });
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setFieldError(null);

    createInvite.mutate(
      { shopId, email, roleId },
      {
        onSuccess: () => {
          onSuccess();
        },
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : 'Something went wrong. Please try again.';
          setApiError(message);
        },
      },
    );
  };

  const hasError = !!fieldError || !!apiError;
  const errorMessage = fieldError ?? apiError;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Invite a member to this shop">
      <div className={styles.content}>
        <h2 className={styles.title}>Invite a member</h2>
        <p className={styles.description}>
          Enter the email address of the person you want to invite and select a role for them.
        </p>

        <div className={styles.field}>
          <label htmlFor="invite-email" className={styles.label}>
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            className={`${styles.input}${hasError && fieldError ? ` ${styles.inputError}` : ''}`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            placeholder="member@example.com"
            autoComplete="email"
            aria-required="true"
            aria-describedby={hasError && fieldError ? 'invite-email-error' : undefined}
            aria-invalid={!!(fieldError) || undefined}
            disabled={createInvite.isPending}
          />
          {fieldError && (
            <p
              id="invite-email-error"
              className={styles.errorMessage}
              role="alert"
              aria-live="assertive"
            >
              {fieldError}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Role</label>
          <RoleSelect
            roles={roles}
            currentRoleId={roleId}
            onChange={(id) => setRoleId(id)}
            disabled={createInvite.isPending}
            ariaLabel="Role for invited member"
          />
        </div>

        {apiError && (
          <p
            className={styles.errorMessage}
            role="alert"
            aria-live="assertive"
          >
            {errorMessage}
          </p>
        )}

        <div className={styles.actions}>
          <Button style="secondary" onClick={onClose} disabled={createInvite.isPending}>
            Cancel
          </Button>
          <Button
            style="primary"
            onClick={handleSubmit}
            loading={createInvite.isPending}
            disabled={createInvite.isPending}
          >
            Send Invite
          </Button>
        </div>
      </div>
    </Modal>
  );
}
