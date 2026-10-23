'use client';

import Avatar from '@/components/controls/avatar';
import AppLink from '@/components/controls/app-link';
import Button from '@/components/controls/button';
import Pill from '@/components/indicators/pill';
import DateTimeDisplay from '@/components/indicators/date-time-display';
import { useToast } from '@/components/indicators/toast/context';
import { useFollowToggle } from '@/features/follows/hooks/use-follow-toggle';
import type { FollowingItem } from '@/features/follows/types/follow';

import styles from './following-card.module.scss';

export interface FollowingCardProps {
  item: FollowingItem;
}

export default function FollowingCard({ item }: FollowingCardProps) {
  const { showToast } = useToast();
  const profileHref =
    item.target_type === 'shop' ? `/shop/${item.target_id}` : `/member/${item.target_id}`;

  const typeLabel = item.target_type === 'shop' ? 'Shop' : 'Member';

  const { mutate, isPending } = useFollowToggle({
    targetType: item.target_type,
    targetId: item.target_id,
    onSuccess: () => {
      showToast({
        message: 'Unfollowed',
        description: `You unfollowed ${item.name}.`,
        type: 'success',
      });
    },
    onError: () => {
      showToast({
        message: 'Something went wrong',
        description: 'Please try again.',
        type: 'error',
      });
    },
  });

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <AppLink href={profileHref}>
          <Avatar
            size="md"
            name={item.name}
            imageUrl={item.avatar_url ?? undefined}
            isShop={item.target_type === 'shop'}
          />
        </AppLink>
        <div className={styles.details}>
          <AppLink href={profileHref} style="secondary">
            <span className={styles.name}>{item.name}</span>
          </AppLink>
          <div className={styles.meta}>
            <Pill color="default">{typeLabel}</Pill>
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
          onClick={() => mutate(true)}
          ariaLabel={`Unfollow ${item.name}`}
        >
          Unfollow
        </Button>
      </div>
    </div>
  );
}
