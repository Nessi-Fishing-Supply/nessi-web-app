import React from 'react';
import SideNav from '@components/navigation/side-nav';
import styles from './dashboard.module.scss';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.dashboardLayout}>
      <SideNav />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
