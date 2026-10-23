'use client';

import Avatar from '@/components/controls/avatar';
import AppLink from '@/components/controls/app-link';
import Button from '@/components/controls/button';
import DateTimeDisplay from '@/components/indicators/date-time-display';
import { useToast } from '@/components/indicators/toast/context';
import { useUnblockMember } from '@/features/blocks/hooks/use-blocked-members';
import type { BlockedMemberItem } from '@/features/blocks/types/block';

import styles from './blocked-member-card.module.scss';

export interface BlockedMemberCardProps {
  item: BlockedMemberItem;
}

export default function BlockedMemberCard({ item }: BlockedMemberCardProps) {
  const { showToast } = useToast();
  const profileHref = item.slug ? `/member/${item.slug}` : `/member/${item.blocked_id}`;
  const { mutate, isPending } = useUnblockMember();

  function handleUnblock() {
    mutate(item.blocked_id, {
      onSuccess: () => {
        showToast({
          message: 'Unblocked',
          description: `You unblocked ${item.name}.`,
          type: 'success',
        });
      },
      onError: () => {
        showToast({
          message: 'Something went wrong',
          description: 'Could not unblock this member. Please try again.',
          type: 'error',
        });
      },
    });
  }

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <AppLink href={profileHref}>
          <Avatar size="md" name={item.name} imageUrl={item.avatar_url ?? undefined} />
        </AppLink>
        <div className={styles.details}>
          <AppLink href={profileHref} style="secondary">
            <span className={styles.name}>{item.name}</span>
          </AppLink>
          <div className={styles.meta}>
            <DateTimeDisplay date={item.created_at} format="relative" />
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <Button
          style="danger"
          outline
          loading={isPending}
          disabled={isPending}
          onClick={handleUnblock}
          ariaLabel={`Unblock ${item.name}`}
        >
          Unblock
        </Button>
      </div>
    </div>
  );
}
