'use client';

import { useState } from 'react';
import { HiUserRemove, HiUsers } from 'react-icons/hi';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context';
import {
  useShopMembers,
  useRemoveShopMember,
  useUpdateMemberRole,
} from '@/features/shops/hooks/use-shops';
import { useShopRoles } from '@/features/shops/hooks/use-shop-roles';
import { useToast } from '@/components/indicators/toast/context';
import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import RoleSelect from '@/features/shops/components/role-select';
import type { Shop, ShopMember } from '@/features/shops/types/shop';
import type { ShopRole } from '@/features/shops/types/permissions';
import { SYSTEM_ROLE_IDS } from '@/features/shops/constants/roles';
import styles from './shop-members-section.module.scss';

interface ShopMembersSectionProps {
  shop: Shop;
}

function getRoleLabel(roleId: string, roles: ShopRole[]): string {
  const role = roles.find((r) => r.id === roleId);
  return role?.name ?? 'Contributor';
}

function getMemberDisplayName(member: ShopMember): string {
  if (member.members) {
    const name = `${member.members.first_name ?? ''} ${member.members.last_name ?? ''}`.trim();
    if (name) return name;
  }
  return member.member_id;
}

interface PendingRoleChange {
  member: ShopMember;
  roleId: string;
}

interface MemberRowProps {
  member: ShopMember;
  isOwner: boolean;
  isCurrentUser: boolean;
  roles: ShopRole[];
  onRemove: (member: ShopMember) => void;
  onRoleChange: (member: ShopMember, roleId: string) => void;
  isRemovePending: boolean;
  pendingRemoveMemberId: string | null;
  pendingRoleMemberId: string | null;
}

function MemberRow({
  member,
  isOwner,
  isCurrentUser,
  roles,
  onRemove,
  onRoleChange,
  isRemovePending,
  pendingRemoveMemberId,
  pendingRoleMemberId,
}: MemberRowProps) {
  const isThisRemovePending = isRemovePending && pendingRemoveMemberId === member.member_id;
  const isThisRolePending = pendingRoleMemberId === member.member_id;
  const isOwnerRole = member.role_id === SYSTEM_ROLE_IDS.OWNER;
  const canRemove = isOwner && !isOwnerRole && !isCurrentUser;
  const canChangeRole = isOwner && !isOwnerRole;
  const displayName = getMemberDisplayName(member);
  const roleLabel = getRoleLabel(member.role_id, roles);

  return (
    <li className={styles.memberRow}>
      <div className={styles.memberInfo}>
        <HiUsers className={styles.memberIcon} aria-hidden="true" />
        <span className={styles.memberId}>
          {displayName}
          {isCurrentUser && (
            <span className={styles.youBadge} aria-label="(you)">
              {' '}
              (you)
            </span>
          )}
        </span>
        {(!isOwner || isOwnerRole) && (
          <span
            className={`${styles.memberRole} ${styles[`role-${roleLabel.toLowerCase()}`] ?? ''}`}
            aria-label={`Role: ${roleLabel}`}
          >
            {roleLabel}
          </span>
        )}
      </div>

      {(canChangeRole || canRemove) && (
        <div className={styles.memberActions}>
          {canChangeRole && (
            <RoleSelect
              roles={roles}
              currentRoleId={member.role_id}
              onChange={(roleId) => onRoleChange(member, roleId)}
              disabled={isRemovePending}
              loading={isThisRolePending}
              ariaLabel={`Change role for ${displayName}`}
            />
          )}
          {canRemove && (
            <Button
              style="danger"
              onClick={() => onRemove(member)}
              loading={isThisRemovePending}
              disabled={isRemovePending || isThisRolePending}
              ariaLabel={`Remove member ${displayName}`}
              icon={<HiUserRemove aria-hidden="true" />}
              iconPosition="left"
            >
              Remove
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

export default function ShopMembersSection({ shop }: ShopMembersSectionProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: members, isLoading, isError } = useShopMembers(shop.id);
  const { data: roles = [] } = useShopRoles(shop.id);
  const removeShopMember = useRemoveShopMember();
  const updateMemberRole = useUpdateMemberRole();

  const [pendingRemoveMemberId, setPendingRemoveMemberId] = useState<string | null>(null);
  const [pendingRoleMemberId, setPendingRoleMemberId] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);

  const isOwner = !!user && shop.owner_id === user.id;

  const handleRemove = (member: ShopMember) => {
    const confirmed = window.confirm(
      `Remove this member from the shop? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setPendingRemoveMemberId(member.member_id);
    removeShopMember.mutate(
      { shopId: shop.id, memberId: member.member_id },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            message: 'Member removed',
            description: 'The member has been removed from this shop.',
          });
        },
        onError: () => {
          showToast({
            type: 'error',
            message: 'Failed to remove member',
            description: 'Something went wrong. Please try again.',
          });
        },
        onSettled: () => {
          setPendingRemoveMemberId(null);
        },
      },
    );
  };

  const handleRoleSelectChange = (member: ShopMember, roleId: string) => {
    if (roleId === member.role_id) return;
    setPendingRoleChange({ member, roleId });
  };

  const handleRoleChangeConfirm = () => {
    if (!pendingRoleChange) return;

    const { member, roleId } = pendingRoleChange;
    setPendingRoleChange(null);

    const previousMembers = queryClient.getQueryData<ShopMember[]>(['shops', shop.id, 'members']);

    // Optimistic update
    queryClient.setQueryData<ShopMember[]>(['shops', shop.id, 'members'], (old) =>
      old?.map((m) => (m.member_id === member.member_id ? { ...m, role_id: roleId } : m)),
    );

    setPendingRoleMemberId(member.member_id);
    updateMemberRole.mutate(
      { shopId: shop.id, memberId: member.member_id, roleId },
      {
        onSuccess: (data) => {
          showToast({
            type: 'success',
            message: `Role updated to ${data.roleName}`,
            description: `${getMemberDisplayName(member)}'s role has been updated.`,
          });
        },
        onError: () => {
          // Rollback optimistic update
          queryClient.setQueryData(['shops', shop.id, 'members'], previousMembers);
          showToast({
            type: 'error',
            message: 'Failed to update role',
            description: 'Something went wrong. Please try again.',
          });
        },
        onSettled: () => {
          setPendingRoleMemberId(null);
        },
      },
    );
  };

  const handleRoleChangeCancel = () => {
    setPendingRoleChange(null);
  };

  return (
    <section className={styles.card} aria-labelledby="shop-members-heading">
      <h2 id="shop-members-heading" className={styles.heading}>
        Members
      </h2>
      <p className={styles.description}>
        People who have access to this shop. Only the owner can manage roles and remove members.
      </p>

      {isLoading && (
        <p className={styles.stateMessage} role="status" aria-live="polite">
          Loading members…
        </p>
      )}

      {isError && (
        <p className={styles.stateMessage} role="alert" aria-live="assertive">
          Failed to load members. Please refresh and try again.
        </p>
      )}

      {!isLoading && !isError && members && members.length === 0 && (
        <p className={styles.stateMessage}>No members found for this shop.</p>
      )}

      {!isLoading && !isError && members && members.length > 0 && (
        <ul className={styles.memberList} aria-label="Shop members">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isOwner={isOwner}
              isCurrentUser={user?.id === member.member_id}
              roles={roles}
              onRemove={handleRemove}
              onRoleChange={handleRoleSelectChange}
              isRemovePending={removeShopMember.isPending}
              pendingRemoveMemberId={pendingRemoveMemberId}
              pendingRoleMemberId={pendingRoleMemberId}
            />
          ))}
        </ul>
      )}

      <Modal
        isOpen={!!pendingRoleChange}
        onClose={handleRoleChangeCancel}
        ariaLabel="Confirm role change"
      >
        {pendingRoleChange && (
          <div className={styles.confirmModal}>
            <h3 className={styles.confirmTitle}>Change member role?</h3>
            <p className={styles.confirmMessage}>
              Change <strong>{getMemberDisplayName(pendingRoleChange.member)}</strong>&apos;s role
              from <strong>{getRoleLabel(pendingRoleChange.member.role_id, roles)}</strong> to{' '}
              <strong>{getRoleLabel(pendingRoleChange.roleId, roles)}</strong>? This will
              immediately update their permissions in this shop.
            </p>
            <div className={styles.confirmActions}>
              <Button style="secondary" onClick={handleRoleChangeCancel}>
                Cancel
              </Button>
              <Button style="primary" onClick={handleRoleChangeConfirm}>
                Change Role
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
