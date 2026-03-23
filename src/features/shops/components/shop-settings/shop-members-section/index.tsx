'use client';

import { useState } from 'react';
import { HiUserRemove, HiUsers } from 'react-icons/hi';
import { useAuth } from '@/features/auth/context';
import { useShopMembers, useRemoveShopMember } from '@/features/shops/hooks/use-shops';
import { useToast } from '@/components/indicators/toast/context';
import Button from '@/components/controls/button';
import type { Shop, ShopMember } from '@/features/shops/types/shop';
import styles from './shop-members-section.module.scss';

interface ShopMembersSectionProps {
  shop: Shop;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
  admin: 'Admin',
  contributor: 'Contributor',
};

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

interface MemberRowProps {
  member: ShopMember;
  isOwner: boolean;
  isCurrentUser: boolean;
  onRemove: (member: ShopMember) => void;
  isPending: boolean;
  pendingMemberId: string | null;
}

function MemberRow({
  member,
  isOwner,
  isCurrentUser,
  onRemove,
  isPending,
  pendingMemberId,
}: MemberRowProps) {
  const isThisPending = isPending && pendingMemberId === member.member_id;
  const isOwnerRole = member.role === 'owner';
  const canRemove = isOwner && !isOwnerRole && !isCurrentUser;

  return (
    <li className={styles.memberRow}>
      <div className={styles.memberInfo}>
        <HiUsers className={styles.memberIcon} aria-hidden="true" />
        <span className={styles.memberId}>
          {member.member_id}
          {isCurrentUser && (
            <span className={styles.youBadge} aria-label="(you)">
              {' '}
              (you)
            </span>
          )}
        </span>
        <span
          className={`${styles.memberRole} ${styles[`role-${member.role}`] ?? ''}`}
          aria-label={`Role: ${getRoleLabel(member.role)}`}
        >
          {getRoleLabel(member.role)}
        </span>
      </div>

      {canRemove && (
        <Button
          style="danger"
          onClick={() => onRemove(member)}
          loading={isThisPending}
          disabled={isPending}
          ariaLabel={`Remove member ${member.member_id}`}
          icon={<HiUserRemove aria-hidden="true" />}
          iconPosition="left"
        >
          Remove
        </Button>
      )}
    </li>
  );
}

export default function ShopMembersSection({ shop }: ShopMembersSectionProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: members, isLoading, isError } = useShopMembers(shop.id);
  const removeShopMember = useRemoveShopMember();

  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);

  const isOwner = !!user && shop.owner_id === user.id;

  const handleRemove = (member: ShopMember) => {
    const confirmed = window.confirm(
      `Remove this member from the shop? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setPendingMemberId(member.member_id);
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
          setPendingMemberId(null);
        },
      },
    );
  };

  return (
    <section className={styles.card} aria-labelledby="shop-members-heading">
      <h2 id="shop-members-heading" className={styles.heading}>
        Members
      </h2>
      <p className={styles.description}>
        People who have access to this shop. Only the owner can remove members.
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
              onRemove={handleRemove}
              isPending={removeShopMember.isPending}
              pendingMemberId={pendingMemberId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
