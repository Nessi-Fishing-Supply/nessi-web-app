'use client';

import { useToast } from '@/components/indicators/toast/context';
import CollapsibleCard from '@/components/layout/collapsible-card';
import Toggle from '@/components/controls/toggle';
import { useUpdateMember } from '@/features/members/hooks/use-member';
import type { Json } from '@/types/database';
import type { Member } from '@/features/members/types/member';

import styles from './notifications.module.scss';

interface NotificationPreferences {
  email: {
    marketing: boolean;
    order_updates: boolean;
    listing_activity: boolean;
    community_messages: boolean;
  };
}

interface NotificationsProps {
  member: Member;
  userId: string;
}

function parsePreferences(raw: Member['notification_preferences']): NotificationPreferences {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const email = (raw as Record<string, unknown>)['email'];
    if (email && typeof email === 'object' && !Array.isArray(email)) {
      const e = email as Record<string, unknown>;
      return {
        email: {
          marketing: typeof e['marketing'] === 'boolean' ? e['marketing'] : true,
          order_updates: typeof e['order_updates'] === 'boolean' ? e['order_updates'] : true,
          listing_activity:
            typeof e['listing_activity'] === 'boolean' ? e['listing_activity'] : true,
          community_messages:
            typeof e['community_messages'] === 'boolean' ? e['community_messages'] : true,
        },
      };
    }
  }
  return {
    email: {
      marketing: true,
      order_updates: true,
      listing_activity: true,
      community_messages: true,
    },
  };
}

const TOGGLES: {
  key: keyof NotificationPreferences['email'];
  label: string;
  description: string;
}[] = [
  {
    key: 'marketing',
    label: 'Marketing emails',
    description: 'Receive promotional emails and deals',
  },
  {
    key: 'order_updates',
    label: 'Order updates',
    description: 'Notifications about your orders',
  },
  {
    key: 'listing_activity',
    label: 'Listing activity',
    description: 'Activity on your listings (likes, questions)',
  },
  {
    key: 'community_messages',
    label: 'Community messages',
    description: 'Direct messages from other users',
  },
];

export default function Notifications({ member, userId }: NotificationsProps) {
  const { showToast } = useToast();
  const updateMember = useUpdateMember();

  const prefs = parsePreferences(member.notification_preferences);

  const handleToggle = async (key: keyof NotificationPreferences['email'], value: boolean) => {
    const updatedPrefs: NotificationPreferences = {
      ...prefs,
      email: {
        ...prefs.email,
        [key]: value,
      },
    };

    try {
      await updateMember.mutateAsync({
        userId,
        data: { notification_preferences: updatedPrefs as unknown as Json },
      });

      showToast({
        message: 'Saved',
        description: 'Notification preferences updated',
        type: 'success',
        duration: 2000,
      });
    } catch {
      showToast({
        message: 'Something went wrong',
        description: 'Could not save your preferences. Please try again.',
        type: 'error',
      });
    }
  };

  return (
    <CollapsibleCard title="Notifications">
      <ul className={styles.list}>
        {TOGGLES.map(({ key, label, description }) => {
          const checked = prefs.email[key];
          const inputId = `notif-${key}`;

          return (
            <li key={key} className={styles.item}>
              <div className={styles.label}>
                <span className={styles.labelText}>{label}</span>
                <span className={styles.description}>{description}</span>
              </div>
              <Toggle
                id={inputId}
                checked={checked}
                onChange={(val) => handleToggle(key, val)}
                disabled={updateMember.isPending}
              />
            </li>
          );
        })}
      </ul>
    </CollapsibleCard>
  );
}
