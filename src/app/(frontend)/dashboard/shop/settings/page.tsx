'use client';

import { useAuth } from '@/features/auth/context';
import useContextStore from '@/features/context/stores/context-store';
import { useShop } from '@/features/shops/hooks/use-shops';
import { useShopPermissions } from '@/features/shops/hooks/use-shop-permissions';
import ShopDetailsSection from '@/features/shops/components/shop-settings/shop-details-section';
import ShopSubscriptionSection from '@/features/shops/components/shop-settings/shop-subscription-section';
import ShopDeletionSection from '@/features/shops/components/shop-settings/shop-deletion-section';
import Button from '@/components/controls/button';
import Link from 'next/link';
import { HiExternalLink } from 'react-icons/hi';
import styles from './shop-settings.module.scss';

export default function ShopSettings() {
  const { isLoading: authLoading } = useAuth();
  const activeContext = useContextStore.use.activeContext();

  const isShopContext = activeContext.type === 'shop';
  const shopId = isShopContext ? activeContext.shopId : '';

  const { data: shop, isLoading: shopLoading, isError, refetch } = useShop(shopId, isShopContext);
  const { permissions, isLoading: permissionsLoading } = useShopPermissions(shopId);

  if (authLoading || shopLoading || permissionsLoading) {
    return (
      <div className={styles.page}>
        <p>Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <p>Failed to load your shop. Please refresh the page and try again.</p>
        <Button style="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const hasFullSettings = permissions.shop_settings === 'full';
  const hasFullMembers = permissions.members === 'full';

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Shop Settings</h1>
      {shop?.slug && (
        <Link href={`/shop/${shop.slug}`} className={styles.viewShop}>
          View public shop page <HiExternalLink aria-hidden="true" />
        </Link>
      )}

      <div className={styles.sections}>
        {shop && <ShopDetailsSection shop={shop} readOnly={!hasFullSettings} />}
        <ShopSubscriptionSection />
      </div>

      {shop && hasFullMembers && <ShopDeletionSection shop={shop} />}
    </div>
  );
}
