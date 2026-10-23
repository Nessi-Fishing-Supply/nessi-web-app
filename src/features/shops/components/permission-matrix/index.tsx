'use client';

import { HiCheck, HiEye, HiMinus } from 'react-icons/hi';
import type {
  ShopPermissions,
  ShopPermissionFeature,
  ShopPermissionLevel,
} from '@/features/shops/types/permissions';
import styles from './permission-matrix.module.scss';

interface PermissionMatrixProps {
  permissions: ShopPermissions;
  disabled: boolean;
}

const FEATURES: ShopPermissionFeature[] = [
  'listings',
  'pricing',
  'orders',
  'messaging',
  'shop_settings',
  'members',
];

const LEVELS: ShopPermissionLevel[] = ['full', 'view', 'none'];

const FEATURE_LABELS: Record<ShopPermissionFeature, string> = {
  listings: 'Listings',
  pricing: 'Pricing',
  orders: 'Orders',
  messaging: 'Messaging',
  shop_settings: 'Shop Settings',
  members: 'Members',
};

const LEVEL_LABELS: Record<ShopPermissionLevel, string> = {
  full: 'Full',
  view: 'View',
  none: 'None',
};

function LevelIcon({ level }: { level: ShopPermissionLevel }) {
  if (level === 'full') return <HiCheck aria-hidden="true" />;
  if (level === 'view') return <HiEye aria-hidden="true" />;
  return <HiMinus aria-hidden="true" />;
}

export default function PermissionMatrix({
  permissions,
  disabled: _disabled, // eslint-disable-line @typescript-eslint/no-unused-vars -- reserved for future custom role editing
}: PermissionMatrixProps) {
  return (
    <div className={styles.matrix}>
      {/* Mobile: stacked card layout */}
      <ul className={styles.mobileList} aria-label="Permission matrix">
        {FEATURES.map((feature) => {
          const activeLevel = permissions[feature];
          return (
            <li key={feature} className={styles.mobileRow}>
              <span className={styles.mobileFeatureLabel}>{FEATURE_LABELS[feature]}</span>
              <span
                className={`${styles.mobileLevelBadge} ${styles[`level-${activeLevel}`]}`}
                aria-label={`${FEATURE_LABELS[feature]}: ${LEVEL_LABELS[activeLevel]} access`}
              >
                <LevelIcon level={activeLevel} />
                {LEVEL_LABELS[activeLevel]}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Desktop: grid/table layout */}
      <div className={styles.table} role="table" aria-label="Permission matrix">
        <div className={styles.headerRow} role="row">
          <div className={styles.headerCell} role="columnheader">
            Feature
          </div>
          {LEVELS.map((level) => (
            <div key={level} className={styles.headerCell} role="columnheader">
              {LEVEL_LABELS[level]}
            </div>
          ))}
        </div>

        {FEATURES.map((feature) => {
          const activeLevel = permissions[feature];
          return (
            <div key={feature} className={styles.tableRow} role="row">
              <div className={styles.featureCell} role="cell">
                {FEATURE_LABELS[feature]}
              </div>
              {LEVELS.map((level) => {
                const isActive = activeLevel === level;
                return (
                  <div
                    key={level}
                    role="cell"
                    className={`${styles.levelCell} ${isActive ? styles[`active-${level}`] : styles.inactive}`}
                    aria-label={`${FEATURE_LABELS[feature]}: ${LEVEL_LABELS[level]} access${isActive ? ' (current)' : ''}`}
                  >
                    {isActive && (
                      <>
                        <LevelIcon level={level} />
                        <span className={styles.levelLabel}>{LEVEL_LABELS[level]}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
