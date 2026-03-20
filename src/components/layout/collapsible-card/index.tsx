'use client';

import React, { useId, useState } from 'react';
import { HiChevronDown } from 'react-icons/hi';
import styles from './collapsible-card.module.scss';

interface CollapsibleCardProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleCard({
  title,
  defaultExpanded = false,
  children,
}: CollapsibleCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const id = useId();
  const headerId = `collapsible-header-${id}`;
  const panelId = `collapsible-panel-${id}`;

  return (
    <div className={styles.card}>
      <button
        id={headerId}
        type="button"
        className={styles.header}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className={styles.title}>{title}</span>
        <span className={`${styles.chevron} ${expanded ? styles.chevronExpanded : ''}`} aria-hidden="true">
          <HiChevronDown />
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={`${styles.content} ${expanded ? styles.contentExpanded : ''}`}
      >
        <div className={styles.contentInner}>{children}</div>
      </div>
    </div>
  );
}
