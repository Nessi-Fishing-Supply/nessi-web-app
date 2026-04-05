'use client';

import { useState } from 'react';
import Image from 'next/image';

import Pill from '@/components/indicators/pill';
import { formatPrice } from '@/features/shared/utils/format';
import ShipModal from '@/features/orders/components/ship-modal';
import { useSellerOrders } from '@/features/orders/hooks/use-seller-orders';
import { STATUS_PILL_MAP, STATUS_LABELS } from '@/features/orders/types/order';
import type { OrderStatus } from '@/features/orders/types/order';

import styles from './sales-page.module.scss';

type SalesTab = 'action_required' | 'shipped' | 'completed';

const TABS: { key: SalesTab; label: string; statuses: string[] }[] = [
  { key: 'action_required', label: 'Action Required', statuses: ['paid'] },
  { key: 'shipped', label: 'Shipped', statuses: ['shipped', 'delivered', 'verification'] },
  { key: 'completed', label: 'Completed', statuses: ['released', 'refunded'] },
];

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<SalesTab>('action_required');
  const [shipOrderId, setShipOrderId] = useState<string | null>(null);

  const { data: allOrders = [], isLoading } = useSellerOrders();

  const currentTabConfig = TABS.find((t) => t.key === activeTab)!;
  const filteredOrders = allOrders.filter((o) => currentTabConfig.statuses.includes(o.status));

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Sales</h1>

      <nav className={styles.tabs} aria-label="Sales status filter">
        <div className={styles.tabScroller}>
          {TABS.map((tab) => {
            const count = allOrders.filter((o) => tab.statuses.includes(o.status)).length;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={isActive}
              >
                {tab.label}
                <span className={styles.tabCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {isLoading ? (
        <p className={styles.loading}>Loading your sales...</p>
      ) : filteredOrders.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            {activeTab === 'action_required'
              ? 'No orders requiring action.'
              : `No ${currentTabConfig.label.toLowerCase()} orders.`}
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {filteredOrders.map((order) => (
            <div key={order.id} className={styles.orderRow}>
              <div className={styles.orderInfo}>
                <div className={styles.orderThumb}>
                  {order.listing?.cover_photo_url ? (
                    <Image
                      src={order.listing.cover_photo_url}
                      alt={order.listing?.title ?? 'Order item'}
                      fill
                      sizes="60px"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className={styles.placeholder} aria-hidden="true" />
                  )}
                </div>
                <div className={styles.orderDetails}>
                  <p className={styles.orderTitle}>{order.listing?.title ?? 'Item'}</p>
                  <p className={styles.orderMeta}>
                    {order.buyer?.first_name ?? 'Guest'} {order.buyer?.last_name ?? ''}
                    <span className={styles.dot}>·</span>
                    {formatPrice(order.amount_cents)}
                  </p>
                </div>
              </div>
              <div className={styles.orderActions}>
                <Pill color={STATUS_PILL_MAP[order.status as OrderStatus] ?? 'default'}>
                  {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                </Pill>
                {order.status === 'paid' && (
                  <button
                    type="button"
                    className={styles.shipBtn}
                    onClick={() => setShipOrderId(order.id)}
                  >
                    Ship
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {shipOrderId && (
        <ShipModal isOpen onClose={() => setShipOrderId(null)} orderId={shipOrderId} />
      )}
    </div>
  );
}
