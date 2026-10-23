'use client';

import { useAuth } from '@/features/auth/context';
import ShopCreationForm from '@/features/shops/components/shop-creation-form';
import styles from './create-shop.module.scss';

export default function CreateShop() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={styles.page}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Create Your Shop</h1>
      <p className={styles.subtitle}>Set up your shop to start selling fishing gear on Nessi.</p>
      <ShopCreationForm ownerId={user.id} />
    </div>
  );
}
