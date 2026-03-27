'use client';

import { useSyncExternalStore } from 'react';
import styles from './side-nav.module.scss';
import {
  HiOutlineHome,
  HiOutlineUserCircle,
  HiOutlineHeart,
  HiOutlineShoppingBag,
  HiOutlineCog,
  HiOutlinePlusCircle,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import AppLink from '@/components/controls/app-link';
import useContextStore from '@/features/context/stores/context-store';
import { useAuth } from '@/features/auth/context';
import { useMember } from '@/features/members/hooks/use-member';
import { useShopsByMember } from '@/features/shops/hooks/use-shops';
import { useShopPermissions } from '@/features/shops/hooks/use-shop-permissions';
import { hasAccess } from '@/features/shops/utils/check-permission';
import type { ShopPermissionFeature } from '@/features/shops/types/permissions';

interface ShopNavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  requiredFeature?: ShopPermissionFeature;
}

const SHOP_NAV_ITEMS: ShopNavItem[] = [
  { href: '/dashboard', icon: <HiOutlineHome />, label: 'Dashboard' },
  {
    href: '/dashboard/listings',
    icon: <HiOutlineShoppingBag />,
    label: 'Listings',
    requiredFeature: 'listings',
  },
  {
    href: '/dashboard/shop/roles',
    icon: <HiOutlineShieldCheck />,
    label: 'Roles & Permissions',
    requiredFeature: 'members',
  },
  {
    href: '/dashboard/shop/settings',
    icon: <HiOutlineCog />,
    label: 'Shop Settings',
    requiredFeature: 'shop_settings',
  },
];

const SideNav = () => {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const activeContext = useContextStore.use.activeContext();
  const { user } = useAuth();
  const { data: member } = useMember(user?.id ?? '', !!user);
  const { data: shops, isLoading: shopsLoading } = useShopsByMember(user?.id ?? '', !!user);
  const hasShops = shopsLoading || (shops?.length ?? 0) > 0;
  const isSeller = member?.is_seller ?? false;

  const isShopContext = mounted && activeContext.type === 'shop';
  const shopId = activeContext.type === 'shop' ? activeContext.shopId : '';

  const { permissions, isLoading: permissionsLoading } = useShopPermissions(shopId);

  return (
    <nav className={styles.sideNav}>
      <ul>
        {isShopContext ? (
          <>
            {SHOP_NAV_ITEMS.map((item) => {
              const permitted =
                permissionsLoading ||
                !item.requiredFeature ||
                hasAccess(permissions, item.requiredFeature);

              if (!permitted) return null;

              return (
                <li key={item.href}>
                  <AppLink href={item.href} icon={item.icon}>
                    {item.label}
                  </AppLink>
                </li>
              );
            })}
          </>
        ) : (
          <>
            <li>
              <AppLink href="/dashboard" icon={<HiOutlineHome />}>
                Dashboard
              </AppLink>
            </li>
            <li>
              <AppLink href="/dashboard/account" icon={<HiOutlineUserCircle />}>
                Account
              </AppLink>
            </li>
            <li>
              <AppLink href="/dashboard/following" icon={<HiOutlineHeart />}>
                Following
              </AppLink>
            </li>
            {isSeller && (
              <li>
                <AppLink href="/dashboard/listings" icon={<HiOutlineShoppingBag />}>
                  Listings
                </AppLink>
              </li>
            )}
            {!hasShops && (
              <li>
                <AppLink href="/dashboard/shop/create" icon={<HiOutlinePlusCircle />}>
                  Create a Shop
                </AppLink>
              </li>
            )}
          </>
        )}
      </ul>
    </nav>
  );
};

export default SideNav;
