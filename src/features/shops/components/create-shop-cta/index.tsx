'use client';

import { HiOutlineOfficeBuilding } from 'react-icons/hi';
import AppLink from '@/components/controls/app-link';
import styles from './create-shop-cta.module.scss';

export default function CreateShopCta() {
  return (
    <div className={styles.ctaCard}>
      <HiOutlineOfficeBuilding className={styles.ctaIcon} aria-hidden="true" />
      <h2 className={styles.ctaTitle}>Open your own shop</h2>
      <p className={styles.ctaDescription}>
        Unlock custom branding, unlimited listings, and team management with a dedicated shop on
        Nessi.
      </p>
      <span className={styles.ctaLink}>
        <AppLink href="/dashboard/shop/create" style="secondary">
          Create a shop
        </AppLink>
      </span>
    </div>
  );
}
