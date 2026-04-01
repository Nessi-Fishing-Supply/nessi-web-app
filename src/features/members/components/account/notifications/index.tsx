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
  browser: {
    push_notifications: boolean;
  };
}

interface NotificationsProps {
  member: Member;
  userId: string;
}

function parsePreferences(raw: Member['notification_preferences']): NotificationPreferences {
  const defaults: NotificationPreferences = {
    email: {
      marketing: true,
      order_updates: true,
      listing_activity: true,
      community_messages: true,
    },
    browser: {
      push_notifications: false,
    },
  };

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;

  const obj = raw as Record<string, unknown>;

  const email = obj['email'];
  if (email && typeof email === 'object' && !Array.isArray(email)) {
    const e = email as Record<string, unknown>;
    defaults.email = {
      marketing: typeof e['marketing'] === 'boolean' ? e['marketing'] : true,
      order_updates: typeof e['order_updates'] === 'boolean' ? e['order_updates'] : true,
      listing_activity: typeof e['listing_activity'] === 'boolean' ? e['listing_activity'] : true,
      community_messages:
        typeof e['community_messages'] === 'boolean' ? e['community_messages'] : true,
    };
  }

  const browser = obj['browser'];
  if (browser && typeof browser === 'object' && !Array.isArray(browser)) {
    const b = browser as Record<string, unknown>;
    defaults.browser = {
      push_notifications:
        typeof b['push_notifications'] === 'boolean' ? b['push_notifications'] : false,
    };
  }

  return defaults;
}

type ToggleItem =
  | {
      section: 'email';
      key: keyof NotificationPreferences['email'];
      label: string;
      description: string;
    }
  | {
      section: 'browser';
      key: keyof NotificationPreferences['browser'];
      label: string;
      description: string;
    };

const EMAIL_TOGGLES: ToggleItem[] = [
  {
    section: 'email',
    key: 'marketing',
    label: 'Marketing emails',
    description: 'Receive promotional emails and deals',
  },
  {
    section: 'email',
    key: 'order_updates',
    label: 'Order updates',
    description: 'Notifications about your orders',
  },
  {
    section: 'email',
    key: 'listing_activity',
    label: 'Listing activity',
    description: 'Activity on your listings (likes, questions)',
  },
  {
    section: 'email',
    key: 'community_messages',
    label: 'Community messages',
    description: 'Direct messages from other users',
  },
];

const BROWSER_TOGGLES: ToggleItem[] = [
  {
    section: 'browser',
    key: 'push_notifications',
    label: 'Browser notifications',
    description: 'Show desktop notifications for new messages',
  },
];

export default function Notifications({ member, userId }: NotificationsProps) {
  const { showToast } = useToast();
  const updateMember = useUpdateMember();

  const prefs = parsePreferences(member.notification_preferences);

  const handleToggle = async (toggle: ToggleItem, value: boolean) => {
    const updatedPrefs: NotificationPreferences = {
      ...prefs,
      [toggle.section]: {
        ...prefs[toggle.section],
        [toggle.key]: value,
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

  const renderToggles = (toggles: ToggleItem[]) =>
    toggles.map((toggle) => {
      const checked =
        toggle.section === 'email'
          ? prefs.email[toggle.key as keyof NotificationPreferences['email']]
          : prefs.browser[toggle.key as keyof NotificationPreferences['browser']];
      const inputId = `notif-${toggle.section}-${toggle.key}`;

      return (
        <li key={inputId} className={styles.item}>
          <div className={styles.label}>
            <span className={styles.labelText}>{toggle.label}</span>
            <span className={styles.description}>{toggle.description}</span>
          </div>
          <Toggle
            id={inputId}
            checked={checked}
            onChange={(val) => handleToggle(toggle, val)}
            disabled={updateMember.isPending}
          />
        </li>
      );
    });

  return (
    <CollapsibleCard title="Notifications">
      <ul className={styles.list}>
        <li className={styles.sectionHeading}>Email</li>
        {renderToggles(EMAIL_TOGGLES)}
        <li className={styles.sectionHeading}>Browser</li>
        {renderToggles(BROWSER_TOGGLES)}
      </ul>
    </CollapsibleCard>
  );
}
