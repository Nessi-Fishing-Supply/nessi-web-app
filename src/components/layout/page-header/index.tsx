'use client';

import React, { useId } from 'react';
import { HiChevronLeft } from 'react-icons/hi';
import styles from './page-header.module.scss';

interface PageHeaderProps {
  title?: string;
  onBack: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, onBack, actions, className }: PageHeaderProps) {
  const titleId = useId();

  return (
    <header className={`${styles.header} ${className ?? ''}`}>
      <button type="button" className={styles.backButton} onClick={onBack} aria-label="Go back">
        <HiChevronLeft aria-hidden="true" />
      </button>
      {title && (
        <h1 className={styles.title} id={titleId}>
          {title}
        </h1>
      )}
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
