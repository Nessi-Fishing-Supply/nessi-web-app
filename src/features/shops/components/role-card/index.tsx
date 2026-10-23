'use client';

import { HiLockClosed } from 'react-icons/hi';
import Pill from '@/components/indicators/pill';
import PermissionMatrix from '@/features/shops/components/permission-matrix';
import type { ShopRole } from '@/features/shops/types/permissions';
import styles from './role-card.module.scss';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full access to all shop features and settings',
  manager: 'Can manage listings, orders, and messaging but cannot manage members',
  contributor: 'Can create and manage listings only',
};

interface RoleCardProps {
  role: ShopRole;
}

export default function RoleCard({ role }: RoleCardProps) {
  const description = ROLE_DESCRIPTIONS[role.slug] ?? '';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.name}>{role.name}</h3>
        {role.is_system && (
          <div className={styles.badges}>
            <HiLockClosed className={styles.lockIcon} aria-hidden="true" />
            <Pill color="default">System</Pill>
          </div>
        )}
      </div>
      {description && <p className={styles.description}>{description}</p>}
      <PermissionMatrix permissions={role.permissions} disabled={role.is_system} />
    </div>
  );
}
