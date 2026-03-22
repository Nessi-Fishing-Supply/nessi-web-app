'use client';

import { useSyncExternalStore } from 'react';
import styles from './side-nav.module.scss';
import {
  HiOutlineHome,
  HiOutlineUserCircle,
  HiOutlineShoppingBag,
  HiOutlineCog,
  HiOutlinePlusCircle,
} from 'react-icons/hi';
import AppLink from '@/components/controls/app-link';
import useContextStore from '@/features/context/stores/context-store';

const SideNav = () => {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const activeContext = useContextStore.use.activeContext();

  const isShopContext = mounted && activeContext.type === 'shop';

  return (
    <nav className={styles.sideNav}>
      <ul>
        <li>
          <AppLink href="/dashboard" icon={<HiOutlineHome />}>
            Dashboard
          </AppLink>
        </li>
        {isShopContext ? (
          <>
            <li>
              <AppLink href="/dashboard/shop/settings" icon={<HiOutlineCog />}>
                Shop Settings
              </AppLink>
            </li>
            <li>
              <AppLink href="/dashboard/listings" icon={<HiOutlineShoppingBag />}>
                Listings
              </AppLink>
            </li>
          </>
        ) : (
          <>
            <li>
              <AppLink href="/dashboard/account" icon={<HiOutlineUserCircle />}>
                Account
              </AppLink>
            </li>
            <li>
              <AppLink href="/dashboard/listings" icon={<HiOutlineShoppingBag />}>
                Listings
              </AppLink>
            </li>
            <li>
              <AppLink href="/dashboard/shop/create" icon={<HiOutlinePlusCircle />}>
                Create a Shop
              </AppLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default SideNav;
