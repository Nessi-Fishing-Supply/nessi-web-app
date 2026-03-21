'use client';

import { useSyncExternalStore } from 'react';
import { HiOutlineShoppingBag } from 'react-icons/hi';
import AppLink from '@/components/controls/app-link';
import useContextStore from '@/features/context/stores/context-store';
import { useShop } from '@/features/shops/hooks/use-shops';
import styles from './dashboard.module.scss';

export default function Dashboard() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const activeContext = useContextStore.use.activeContext();
  const shopId = activeContext.type === 'shop' ? activeContext.shopId : '';
  const { data: shop } = useShop(shopId, activeContext.type === 'shop');

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Dashboard</h1>
      <p className={styles.subtitle}>Welcome to your dashboard!</p>

      {mounted && activeContext.type === 'member' && (
        <div className={styles.ctaCard}>
          <HiOutlineShoppingBag className={styles.ctaIcon} aria-hidden="true" />
          <h2 className={styles.ctaTitle}>Ready to sell?</h2>
          <p className={styles.ctaDescription}>
            Create a shop to start listing your fishing gear on Nessi.
          </p>
          <span className={styles.ctaLink}>
            <AppLink href="/dashboard/shop/create">Create a Shop</AppLink>
          </span>
        </div>
      )}

      {mounted && activeContext.type === 'shop' && shop && (
        <p className={styles.shopContext}>
          Managing: <strong>{shop.shop_name}</strong>
        </p>
      )}
    </div>
  );
}
