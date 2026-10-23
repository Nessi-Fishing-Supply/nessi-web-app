'use client';

import React from 'react';
import { HiChevronRight } from 'react-icons/hi';
import styles from './settings-row.module.scss';

interface SettingsRowProps {
  label: string;
  icon?: React.ReactNode;
  value?: string;
  type: 'toggle' | 'nav' | 'display';
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  onClick?: () => void;
  className?: string;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  icon,
  value,
  type,
  checked,
  onChange,
  onClick,
  className,
}) => {
  if (type === 'nav') {
    return (
      <button
        type="button"
        className={`${styles.root} ${styles.nav} ${className ?? ''}`}
        onClick={onClick}
      >
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={styles.label}>{label}</span>
        <span className={styles.trailing}>
          {value && <span className={styles.value}>{value}</span>}
          <HiChevronRight className={styles.chevron} aria-hidden="true" />
        </span>
      </button>
    );
  }

  if (type === 'toggle') {
    const id = `settings-toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;
    return (
      <div className={`${styles.root} ${styles.toggle} ${className ?? ''}`}>
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        <span className={styles.trailing}>
          <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked ?? false}
            aria-label={label}
            className={`${styles.switchTrack} ${checked ? styles.switchOn : ''}`}
            onClick={() => onChange?.(!checked)}
          >
            <span className={styles.switchThumb} />
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className={`${styles.root} ${styles.display} ${className ?? ''}`}>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles.label}>{label}</span>
      {value && (
        <span className={styles.trailing}>
          <span className={styles.value}>{value}</span>
        </span>
      )}
    </div>
  );
};

export default SettingsRow;
