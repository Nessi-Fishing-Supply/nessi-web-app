'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import AppLink from '@/components/controls/app-link';
import Button from '@/components/controls/button';
import { useAuth } from '@/features/auth/context';
import { useMember } from '@/features/members/hooks/use-member';
import { formatMemberName } from '@/features/members/utils/format-name';
import StartSellingCta from '@/features/members/components/start-selling-cta';
import SellerOnboardingModal from '@/features/members/components/seller-onboarding-modal';
import CreateShopCta from '@/features/shops/components/create-shop-cta';
import useContextStore from '@/features/context/stores/context-store';
import { useShop } from '@/features/shops/hooks/use-shops';
import styles from './dashboard.module.scss';

export default function Dashboard() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const router = useRouter();
  const { user } = useAuth();
  const { data: member, isLoading: memberLoading } = useMember(user?.id ?? '', !!user);

  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);

  const activeContext = useContextStore.use.activeContext();
  const shopId = activeContext.type === 'shop' ? activeContext.shopId : '';
  const { data: shop } = useShop(shopId, activeContext.type === 'shop');

  const handleModalComplete = (path: 'free' | 'shop') => {
    setIsSellerModalOpen(false);
    if (path === 'shop') {
      router.push('/dashboard/shop/create');
    }
  };

  const isShopContext = mounted && activeContext.type === 'shop' && !!shop;
  const welcomeName = isShopContext
    ? shop.shop_name
    : memberLoading
      ? null
      : member
        ? formatMemberName(member.first_name ?? '', member.last_name ?? '')
        : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {welcomeName ? `Welcome back, ${welcomeName}` : 'Welcome back'}
        </h1>
        {isShopContext && member && (
          <p className={styles.contextHint}>
            Logged in as{' '}
            <strong>{formatMemberName(member.first_name ?? '', member.last_name ?? '')}</strong>
          </p>
        )}
      </div>

      {mounted && activeContext.type === 'member' && (
        <>
          <div className={styles.ctaGrid}>
            {!memberLoading && member?.is_seller === false && (
              <StartSellingCta onStartSelling={() => setIsSellerModalOpen(true)} />
            )}
            <CreateShopCta />
          </div>

          {!memberLoading && member?.is_seller === true && (
            <div className={styles.sellerSection}>
              <h2 className={styles.sellerHeading}>Your listings</h2>
              <Button onClick={() => router.push('/dashboard/listings/new')}>Create Listing</Button>
              <AppLink href="/dashboard/listings">Manage your listings</AppLink>
            </div>
          )}

          {user && (
            <SellerOnboardingModal
              isOpen={isSellerModalOpen}
              onClose={() => setIsSellerModalOpen(false)}
              userId={user.id}
              onComplete={handleModalComplete}
            />
          )}
        </>
      )}

      {mounted && activeContext.type === 'shop' && shop && (
        <div className={styles.shopPlaceholder}>
          <p>
            <strong>{shop.shop_name}</strong> — Shop dashboard coming soon
          </p>
          <Button onClick={() => router.push('/dashboard/listings/new')}>Create Listing</Button>
        </div>
      )}
    </div>
  );
}
