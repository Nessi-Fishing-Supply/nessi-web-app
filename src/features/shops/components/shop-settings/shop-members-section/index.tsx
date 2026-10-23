'use client';

import { useState, useRef, useEffect } from 'react';
import {
  HiDotsVertical,
  HiSwitchHorizontal,
  HiUserRemove,
  HiShieldCheck,
  HiUserAdd,
  HiLogout,
} from 'react-icons/hi';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context';
import {
  useShopMembers,
  useRemoveShopMember,
  useUpdateMemberRole,
  useTransferOwnership,
} from '@/features/shops/hooks/use-shops';
import useContextStore from '@/features/context/stores/context-store';
import { useShopRoles } from '@/features/shops/hooks/use-shop-roles';
import { useShopInvites } from '@/features/shops/hooks/use-shop-invites';
import { useToast } from '@/components/indicators/toast/context';
import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import RoleSelect from '@/features/shops/components/role-select';
import InviteMemberModal from '@/features/shops/components/invite-member-modal';
import PendingInvitesList from '@/features/shops/components/pending-invites-list';
import type { Shop, ShopMember } from '@/features/shops/types/shop';
import type { ShopRole } from '@/features/shops/types/permissions';
import { SYSTEM_ROLE_IDS } from '@/features/shops/constants/roles';
import { MAX_MEMBERS_PER_SHOP } from '@/features/shops/constants/limits';
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
  return 'Unknown Member';
}

function getMemberHandle(member: ShopMember): string | null {
  return member.members?.slug ?? null;
}

function getMemberInitials(member: ShopMember): string {
  if (member.members) {
    const first = member.members.first_name?.[0] ?? '';
    const last = member.members.last_name?.[0] ?? '';
    if (first || last) return `${first}${last}`.toUpperCase();
  }
  return '?';
}

type ModalAction =
  | { type: 'changeRole'; member: ShopMember }
  | { type: 'remove'; member: ShopMember }
  | { type: 'transfer'; member: ShopMember }
  | { type: 'leave'; member: ShopMember };

interface MemberRowProps {
  member: ShopMember;
  isOwner: boolean;
  isCurrentUser: boolean;
  roles: ShopRole[];
  onAction: (action: ModalAction) => void;
  isPending: boolean;
}

function MemberRow({ member, isOwner, isCurrentUser, roles, onAction, isPending }: MemberRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isOwnerRole = member.role_id === SYSTEM_ROLE_IDS.OWNER;
  const displayName = getMemberDisplayName(member);
  const handle = getMemberHandle(member);
  const roleLabel = getRoleLabel(member.role_id, roles);
  const initials = getMemberInitials(member);
  const avatarUrl = member.members?.avatar_url;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const showMenu = isOwner && !isOwnerRole && !isCurrentUser;
  const showLeaveButton = isCurrentUser && !isOwnerRole;

  return (
    <li className={styles.memberRow}>
      <div className={styles.memberInfo}>
        <div className={styles.avatar}>
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={40} height={40} className={styles.avatarImage} />
          ) : (
            <span className={styles.avatarInitials} aria-hidden="true">
              {initials}
            </span>
          )}
        </div>
        <div className={styles.memberDetails}>
          <span className={styles.memberName}>
            {displayName}
            {isCurrentUser && (
              <span className={styles.youBadge} aria-label="(you)">
                {' '}
                (you)
              </span>
            )}
          </span>
          {handle && <span className={styles.memberHandle}>@{handle}</span>}
        </div>
        <span
          className={`${styles.memberRole} ${styles[`role-${roleLabel.toLowerCase()}`] ?? ''}`}
          aria-label={`Role: ${roleLabel}`}
        >
          {roleLabel}
        </span>
      </div>

      {showLeaveButton && (
        <Button
          style="danger"
          onClick={() => onAction({ type: 'leave', member })}
          disabled={isPending}
          ariaLabel="Leave this shop"
          icon={<HiLogout aria-hidden="true" />}
          iconPosition="left"
        >
          Leave
        </Button>
      )}

      {showMenu && (
        <div className={styles.menuWrapper} ref={menuRef}>
          <button
            ref={buttonRef}
            className={styles.menuButton}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={`Actions for ${displayName}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            disabled={isPending}
          >
            <HiDotsVertical aria-hidden="true" />
          </button>

          {menuOpen && (
            <div className={styles.menu} role="menu" aria-label="Member actions">
              <button
                className={styles.menuItem}
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onAction({ type: 'changeRole', member });
                }}
              >
                <HiSwitchHorizontal aria-hidden="true" />
                Change Role
              </button>
              <button
                className={styles.menuItem}
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onAction({ type: 'transfer', member });
                }}
              >
                <HiShieldCheck aria-hidden="true" />
                Transfer Ownership
              </button>
              <div className={styles.menuDivider} role="separator" />
              <button
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onAction({ type: 'remove', member });
                }}
              >
                <HiUserRemove aria-hidden="true" />
                Remove from Shop
              </button>
            </div>
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
  const transferOwnership = useTransferOwnership();

  const {
    data: invites = [],
    isLoading: invitesLoading,
    isError: invitesError,
  } = useShopInvites(shop.id);

  const [modalAction, setModalAction] = useState<ModalAction | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const isOwner = !!user && shop.owner_id === user.id;
  const isPending =
    removeShopMember.isPending || updateMemberRole.isPending || transferOwnership.isPending;

  const pendingInviteCount = invites.filter((inv) => inv.status === 'pending').length;
  const memberCount = members?.length ?? 0;
  const totalCount = memberCount + pendingInviteCount;
  const isAtCap = totalCount >= MAX_MEMBERS_PER_SHOP;

  const handleAction = (action: ModalAction) => {
    setModalAction(action);
    if (action.type === 'changeRole') {
      setSelectedRoleId(action.member.role_id);
    }
  };

  const closeModal = () => {
    setModalAction(null);
    setSelectedRoleId(null);
    setConfirmName('');
  };

  const handleConfirmRemove = () => {
    if (modalAction?.type !== 'remove') return;
    const { member } = modalAction;
    closeModal();

    removeShopMember.mutate(
      { shopId: shop.id, memberId: member.member_id },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            message: 'Member removed',
            description: `${getMemberDisplayName(member)} has been removed from this shop.`,
          });
        },
        onError: () => {
          showToast({
            type: 'error',
            message: 'Failed to remove member',
            description: 'Something went wrong. Please try again.',
          });
        },
      },
    );
  };

  const handleConfirmRoleChange = () => {
    if (modalAction?.type !== 'changeRole' || !selectedRoleId) return;
    const { member } = modalAction;
    if (selectedRoleId === member.role_id) {
      closeModal();
      return;
    }

    closeModal();

    const previousMembers = queryClient.getQueryData<ShopMember[]>(['shops', shop.id, 'members']);

    queryClient.setQueryData<ShopMember[]>(['shops', shop.id, 'members'], (old) =>
      old?.map((m) => (m.member_id === member.member_id ? { ...m, role_id: selectedRoleId } : m)),
    );

    updateMemberRole.mutate(
      { shopId: shop.id, memberId: member.member_id, roleId: selectedRoleId },
      {
        onSuccess: (data) => {
          showToast({
            type: 'success',
            message: `Role updated to ${data.roleName}`,
            description: `${getMemberDisplayName(member)}'s role has been updated.`,
          });
        },
        onError: () => {
          queryClient.setQueryData(['shops', shop.id, 'members'], previousMembers);
          showToast({
            type: 'error',
            message: 'Failed to update role',
            description: 'Something went wrong. Please try again.',
          });
        },
      },
    );
  };

  const handleTransferConfirm = async () => {
    if (modalAction?.type !== 'transfer') return;
    const { member } = modalAction;

    try {
      await transferOwnership.mutateAsync({
        shopId: shop.id,
        newOwnerId: member.member_id,
      });
      useContextStore.getState().switchToMember();
      showToast({
        type: 'success',
        message: 'Ownership transferred',
        description: `${getMemberDisplayName(member)} is now the shop owner. You've been downgraded to Manager.`,
      });
      closeModal();
    } catch {
      showToast({
        type: 'error',
        message: 'Transfer failed',
        description: 'Something went wrong. Please try again.',
      });
    }
  };

  const handleConfirmLeave = async () => {
    if (modalAction?.type !== 'leave') return;
    const { member } = modalAction;

    try {
      await removeShopMember.mutateAsync({
        shopId: shop.id,
        memberId: member.member_id,
      });
      useContextStore.getState().switchToMember();
      queryClient.invalidateQueries({ queryKey: ['shops', 'member', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      showToast({
        type: 'success',
        message: `You left ${shop.shop_name}`,
        description: 'You no longer have access to this shop.',
      });
      closeModal();
    } catch {
      showToast({
        type: 'error',
        message: 'Failed to leave shop',
        description: 'Something went wrong. Please try again.',
      });
    }
  };

  const transferTarget =
    modalAction?.type === 'transfer' ? getMemberDisplayName(modalAction.member) : '';
  const transferPhrase = `Transfer Ownership to ${transferTarget}`;
  const isTransferPhraseMatch = confirmName === transferPhrase;

  const leaveTarget = modalAction?.type === 'leave' ? getMemberDisplayName(modalAction.member) : '';
  const leavePhrase = `I ${leaveTarget} want to leave ${shop.shop_name}`;
  const isLeavePhraseMatch = modalAction?.type === 'leave' && confirmName === leavePhrase;

  return (
    <>
      <section className={styles.card} aria-labelledby="shop-members-heading">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="shop-members-heading" className={styles.heading}>
              {!isLoading && !isError
                ? `Members (${totalCount}/${MAX_MEMBERS_PER_SHOP})`
                : 'Members'}
            </h2>
            <p className={styles.description}>
              People who have access to this shop. Only the owner can manage roles and remove
              members.
            </p>
          </div>
          {isOwner && (
            <span
              title={
                isAtCap
                  ? `Maximum of ${MAX_MEMBERS_PER_SHOP} members reached (includes pending invites)`
                  : undefined
              }
            >
              <Button
                style="secondary"
                onClick={() => setIsInviteModalOpen(true)}
                disabled={isAtCap}
                icon={<HiUserAdd aria-hidden="true" />}
                iconPosition="left"
                ariaLabel="Invite member"
              >
                Invite
              </Button>
            </span>
          )}
        </div>

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
                onAction={handleAction}
                isPending={isPending}
              />
            ))}
          </ul>
        )}

        {/* Change Role Modal */}
        <Modal
          isOpen={modalAction?.type === 'changeRole'}
          onClose={closeModal}
          ariaLabel="Change member role"
        >
          {modalAction?.type === 'changeRole' && (
            <div className={styles.confirmModal}>
              <h3 className={styles.confirmTitle}>Change role</h3>
              <p className={styles.confirmMessage}>
                Select a new role for <strong>{getMemberDisplayName(modalAction.member)}</strong>.
              </p>
              <div className={styles.roleSelectWrapper}>
                <RoleSelect
                  roles={roles}
                  currentRoleId={selectedRoleId ?? modalAction.member.role_id}
                  onChange={(roleId) => setSelectedRoleId(roleId)}
                  ariaLabel={`New role for ${getMemberDisplayName(modalAction.member)}`}
                />
              </div>
              {selectedRoleId && selectedRoleId !== modalAction.member.role_id && (
                <p className={styles.confirmHint}>
                  This will change their role from{' '}
                  <strong>{getRoleLabel(modalAction.member.role_id, roles)}</strong> to{' '}
                  <strong>{getRoleLabel(selectedRoleId, roles)}</strong> and immediately update
                  their permissions.
                </p>
              )}
              <div className={styles.confirmActions}>
                <Button style="secondary" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  style="primary"
                  onClick={handleConfirmRoleChange}
                  disabled={!selectedRoleId || selectedRoleId === modalAction.member.role_id}
                >
                  Change Role
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Remove Member Modal */}
        <Modal
          isOpen={modalAction?.type === 'remove'}
          onClose={closeModal}
          ariaLabel="Remove member from shop"
        >
          {modalAction?.type === 'remove' && (
            <div className={styles.confirmModal}>
              <h3 className={styles.confirmTitle}>Remove member?</h3>
              <p className={styles.confirmMessage}>
                Remove <strong>{getMemberDisplayName(modalAction.member)}</strong> from this shop?
                They will lose all access immediately. This action cannot be undone.
              </p>
              <div className={styles.confirmActions}>
                <Button style="secondary" onClick={closeModal}>
                  Cancel
                </Button>
                <Button style="danger" onClick={handleConfirmRemove}>
                  Remove Member
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Transfer Ownership — requires typing full confirmation phrase */}
        <Modal
          isOpen={modalAction?.type === 'transfer'}
          onClose={closeModal}
          ariaLabel="Confirm ownership transfer"
        >
          {modalAction?.type === 'transfer' && (
            <div className={styles.confirmModal}>
              <h3 className={styles.confirmTitle}>Transfer shop ownership</h3>
              <p className={styles.confirmMessage}>
                You are about to transfer ownership of <strong>{shop.shop_name}</strong> to{' '}
                <strong>{getMemberDisplayName(modalAction.member)}</strong>. This will:
              </p>
              <ul className={styles.confirmList}>
                <li>Immediately grant them full owner privileges</li>
                <li>
                  Downgrade your role to Manager — you keep shop access but lose owner controls
                </li>
                <li>Switch your context back to your member profile</li>
              </ul>
              <p className={styles.confirmMessage} id="transfer-confirm-hint">
                To confirm, type <strong className={styles.confirmPhrase}>{transferPhrase}</strong>{' '}
                below.
              </p>
              <label htmlFor="transfer-confirm-input" className="sr-only">
                Transfer confirmation phrase
              </label>
              <input
                id="transfer-confirm-input"
                className={styles.confirmInput}
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={transferPhrase}
                aria-describedby="transfer-confirm-hint"
                autoComplete="off"
              />
              <div className={styles.confirmActions}>
                <Button
                  style="secondary"
                  onClick={closeModal}
                  disabled={transferOwnership.isPending}
                >
                  Cancel
                </Button>
                <Button
                  style="danger"
                  onClick={handleTransferConfirm}
                  disabled={!isTransferPhraseMatch}
                  loading={transferOwnership.isPending}
                >
                  Transfer Ownership
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Invite Member Modal */}
        <InviteMemberModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          shopId={shop.id}
          roles={roles}
          onSuccess={() => {
            setIsInviteModalOpen(false);
            showToast({
              type: 'success',
              message: 'Invitation sent',
              description: 'The invitation email has been sent successfully.',
            });
          }}
        />

        {/* Leave Shop — requires typing full confirmation phrase */}
        <Modal
          isOpen={modalAction?.type === 'leave'}
          onClose={closeModal}
          ariaLabel="Confirm leaving shop"
        >
          {modalAction?.type === 'leave' && (
            <div className={styles.confirmModal}>
              <h3 className={styles.confirmTitle}>Leave shop?</h3>
              <p className={styles.confirmMessage}>
                You are about to leave <strong>{shop.shop_name}</strong>. This will:
              </p>
              <ul className={styles.confirmList}>
                <li>Immediately revoke your access to this shop</li>
                <li>
                  Leave your listings and contributions intact, but you can no longer manage them
                </li>
                <li>Switch your context back to your member profile</li>
              </ul>
              <p className={styles.confirmMessage} id="leave-confirm-hint">
                To confirm, type <strong className={styles.confirmPhrase}>{leavePhrase}</strong>{' '}
                below.
              </p>
              <label htmlFor="leave-confirm-input" className="sr-only">
                Leave confirmation phrase
              </label>
              <input
                id="leave-confirm-input"
                className={styles.confirmInput}
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={leavePhrase}
                aria-describedby="leave-confirm-hint"
                autoComplete="off"
              />
              <div className={styles.confirmActions}>
                <Button
                  style="secondary"
                  onClick={closeModal}
                  disabled={removeShopMember.isPending}
                >
                  Cancel
                </Button>
                <Button
                  style="danger"
                  onClick={handleConfirmLeave}
                  disabled={!isLeavePhraseMatch}
                  loading={removeShopMember.isPending}
                >
                  Leave Shop
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </section>

      {isOwner && (
        <PendingInvitesList
          invites={invites}
          roles={roles}
          shopId={shop.id}
          isOwner={isOwner}
          isLoading={invitesLoading}
          isError={invitesError}
        />
      )}
    </>
  );
}
