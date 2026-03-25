import React from 'react';
import SideNav from '@/components/navigation/side-nav';
import ShopRouteGuard from '@/features/shops/components/shop-route-guard';
import styles from './dashboard.module.scss';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.dashboardLayout}>
      <SideNav />
      <main className={styles.mainContent}>
        <ShopRouteGuard>{children}</ShopRouteGuard>
      </main>
    </div>
  );
}
