'use client';

import { useState } from 'react';
import { HiOutlinePlus } from 'react-icons/hi';
import { useAuth } from '@/features/auth/context';
import useContextStore from '@/features/context/stores/context-store';
import { useShopRoles } from '@/features/shops/hooks/use-shop-roles';
import { useShopPermissions } from '@/features/shops/hooks/use-shop-permissions';
import RoleCard from '@/features/shops/components/role-card';
import CustomRoleUpsellModal from '@/features/shops/components/custom-role-upsell-modal';
import Button from '@/components/controls/button';
import type { ShopRole } from '@/features/shops/types/permissions';
import styles from './roles-permissions-page.module.scss';

const SYSTEM_ROLE_ORDER = ['owner', 'manager', 'contributor'];

function sortRoles(roles: ShopRole[]): ShopRole[] {
  return [...roles].sort((a, b) => {
    const aIndex = SYSTEM_ROLE_ORDER.indexOf(a.slug);
    const bIndex = SYSTEM_ROLE_ORDER.indexOf(b.slug);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

export default function RolesPermissionsPage() {
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const { isLoading: authLoading } = useAuth();
  const activeContext = useContextStore.use.activeContext();

  const isShopContext = activeContext.type === 'shop';
  const shopId = isShopContext ? activeContext.shopId : '';

  const { data: roles, isLoading: rolesLoading, isError, refetch } = useShopRoles(shopId);
  const { role, isLoading: permissionsLoading } = useShopPermissions(shopId);

  if (authLoading || rolesLoading || permissionsLoading) {
    return (
      <div className={styles.page}>
        <p>Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <p>Failed to load roles. Please refresh the page and try again.</p>
        <Button style="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const isOwner = role === 'owner';
  const sortedRoles = sortRoles(roles ?? []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Roles &amp; Permissions</h1>
        {isOwner && (
          <div className={styles.addButton}>
            <Button style="secondary" onClick={() => setIsUpsellOpen(true)}>
              <HiOutlinePlus aria-hidden="true" />
              Add Custom Role
            </Button>
          </div>
        )}
      </div>

      <div className={styles.roles}>
        {sortedRoles.map((r) => (
          <RoleCard key={r.id} role={r} />
        ))}
      </div>

      <CustomRoleUpsellModal isOpen={isUpsellOpen} onClose={() => setIsUpsellOpen(false)} />
    </div>
  );
}
