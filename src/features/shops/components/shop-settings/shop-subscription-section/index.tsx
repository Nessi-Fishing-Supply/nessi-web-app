'use client';

import React from 'react';
import Button from '@/components/controls/button';
import styles from './shop-subscription-section.module.scss';

export default function ShopSubscriptionSection() {
  return (
    <section className={styles.card}>
      <h2 className={styles.heading}>Subscription &amp; Billing</h2>
      <p className={styles.description}>
        Manage your shop&apos;s subscription plan and billing details.
      </p>
      <Button style="secondary" disabled ariaLabel="Coming soon">
        Coming Soon
      </Button>
    </section>
  );
}
