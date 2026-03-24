'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import useContextStore from '@/features/context/stores/context-store';
import { useShop } from '@/features/shops/hooks/use-shops';
import ShopDetailsSection from '@/features/shops/components/shop-settings/shop-details-section';
import ShopMembersSection from '@/features/shops/components/shop-settings/shop-members-section';
import ShopSubscriptionSection from '@/features/shops/components/shop-settings/shop-subscription-section';
import OwnershipTransferSection from '@/features/shops/components/shop-settings/ownership-transfer-section';
import ShopDeletionSection from '@/features/shops/components/shop-settings/shop-deletion-section';
import Button from '@/components/controls/button';
import Link from 'next/link';
import { HiExternalLink } from 'react-icons/hi';
import styles from './shop-settings.module.scss';

export default function ShopSettings() {
  const { user, isLoading: authLoading } = useAuth();
  const activeContext = useContextStore.use.activeContext();
  const router = useRouter();

  const isShopContext = activeContext.type === 'shop';
  const shopId = isShopContext ? activeContext.shopId : '';

  const { data: shop, isLoading: shopLoading, isError, refetch } = useShop(shopId, isShopContext);

  useEffect(() => {
    if (!authLoading && !isShopContext) {
      router.push('/dashboard');
    }
  }, [authLoading, isShopContext, router]);

  if (authLoading || shopLoading) {
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

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Shop Settings</h1>
      {shop?.slug && (
        <Link href={`/shop/${shop.slug}`} className={styles.viewShop}>
          View public shop page <HiExternalLink aria-hidden="true" />
        </Link>
      )}

      <div className={styles.sections}>
        {shop && <ShopDetailsSection shop={shop} />}
        {shop && <ShopMembersSection shop={shop} />}
        <ShopSubscriptionSection />
        {shop && user && shop.owner_id === user.id && <OwnershipTransferSection shop={shop} />}
      </div>

      {shop && user && shop.owner_id === user.id && <ShopDeletionSection shop={shop} />}
    </div>
  );
}
