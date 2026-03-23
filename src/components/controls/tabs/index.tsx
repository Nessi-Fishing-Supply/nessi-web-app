'use client';

import styles from './tabs.module.scss';

export interface TabItem {
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export default function Tabs({ items, activeIndex, onChange }: TabsProps) {
  return (
    <nav className={styles.tabs} aria-label="Tabs">
      <ul role="tablist" className={styles.list}>
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <li key={index} role="presentation" className={styles.item}>
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={`${styles.tab} ${isActive ? styles.active : ''}`}
                onClick={() => onChange(index)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    onChange((index + 1) % items.length);
                  }
                  if (e.key === 'ArrowLeft') {
                    onChange((index - 1 + items.length) % items.length);
                  }
                }}
              >
                {item.label}
                {item.count !== undefined && (
                  <span className={styles.count} aria-label={`${item.count} items`}>
                    ({item.count})
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
