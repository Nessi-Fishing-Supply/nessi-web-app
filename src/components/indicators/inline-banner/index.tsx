import React from 'react';
import { HiInformationCircle, HiCheckCircle, HiExclamation, HiXCircle } from 'react-icons/hi';
import styles from './inline-banner.module.scss';

interface InlineBannerProps {
  variant: 'warning' | 'error' | 'info' | 'success';
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

const icons = {
  info: HiInformationCircle,
  success: HiCheckCircle,
  warning: HiExclamation,
  error: HiXCircle,
};

const InlineBanner: React.FC<InlineBannerProps> = ({
  variant,
  title,
  description,
  action,
  className,
}) => {
  const Icon = icons[variant];
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      className={`${styles.root} ${styles[variant]} ${className ?? ''}`}
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
    >
      <Icon className={styles.icon} aria-hidden="true" />
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        {description && <p className={styles.description}>{description}</p>}
        {action && (
          <button className={styles.action} onClick={action.onClick} type="button">
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};

export default InlineBanner;
