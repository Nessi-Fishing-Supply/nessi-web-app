'use client';

import { useState } from 'react';
import { HiOutlinePlus } from 'react-icons/hi';
import { useAuth } from '@/features/auth/context';
import useContextStore from '@/features/context/stores/context-store';
import { useShop } from '@/features/shops/hooks/use-shops';
import { useShopRoles } from '@/features/shops/hooks/use-shop-roles';
import { useShopPermissions } from '@/features/shops/hooks/use-shop-permissions';
import RoleCard from '@/features/shops/components/role-card';
import CustomRoleUpsellModal from '@/features/shops/components/custom-role-upsell-modal';
import ShopMembersSection from '@/features/shops/components/shop-settings/shop-members-section';
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
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const { isLoading: authLoading } = useAuth();
  const activeContext = useContextStore.use.activeContext();

  const isShopContext = activeContext.type === 'shop';
  const shopId = isShopContext ? activeContext.shopId : '';

  const { data: shop, isLoading: shopLoading } = useShop(shopId, isShopContext);
  const { data: roles, isLoading: rolesLoading, isError, refetch } = useShopRoles(shopId);
  const { role, permissions, isLoading: permissionsLoading } = useShopPermissions(shopId);

  if (authLoading || shopLoading || rolesLoading || permissionsLoading) {
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
  const hasFullMembers = permissions.members === 'full';
  const sortedRoles = sortRoles(roles ?? []);
  const selectedRoleId = activeRoleId ?? sortedRoles[0]?.id ?? null;
  const selectedRole = sortedRoles.find((r) => r.id === selectedRoleId);

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

      {sortedRoles.length > 0 && (
        <div className={styles.roles}>
          <div className={styles.tabList} role="tablist" aria-label="Shop roles">
            {sortedRoles.map((r) => (
              <button
                key={r.id}
                role="tab"
                aria-selected={r.id === selectedRoleId}
                aria-controls={`role-panel-${r.id}`}
                id={`role-tab-${r.id}`}
                className={`${styles.tab} ${r.id === selectedRoleId ? styles.tabActive : ''}`}
                onClick={() => setActiveRoleId(r.id)}
              >
                {r.name}
              </button>
            ))}
          </div>

          {selectedRole && (
            <div
              role="tabpanel"
              id={`role-panel-${selectedRole.id}`}
              aria-labelledby={`role-tab-${selectedRole.id}`}
              className={styles.tabPanel}
            >
              <RoleCard role={selectedRole} />
            </div>
          )}
        </div>
      )}

      {shop && hasFullMembers && (
        <div className={styles.membersSection}>
          <ShopMembersSection shop={shop} />
        </div>
      )}

      <CustomRoleUpsellModal isOpen={isUpsellOpen} onClose={() => setIsUpsellOpen(false)} />
    </div>
  );
}
