import React from 'react';
import { HiExclamationCircle, HiXCircle, HiEmojiSad } from 'react-icons/hi';
import styles from './error-state.module.scss';

interface ErrorStateProps {
  variant: 'inline' | 'banner' | '404';
  message: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  variant,
  message,
  description,
  action,
  className,
}) => {
  if (variant === 'inline') {
    return (
      <span className={`${styles.inline} ${className ?? ''}`} role="alert" aria-live="assertive">
        <HiXCircle className={styles.inlineIcon} aria-hidden="true" />
        <span>{message}</span>
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`${styles.banner} ${className ?? ''}`} role="alert" aria-live="assertive">
        <HiExclamationCircle className={styles.bannerIcon} aria-hidden="true" />
        <div className={styles.bannerBody}>
          <p className={styles.bannerTitle}>{message}</p>
          {description && <p className={styles.bannerDescription}>{description}</p>}
          {action && (
            <button type="button" className={styles.bannerAction} onClick={action.onClick}>
              {action.label}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${className ?? ''}`} role="main">
      <HiEmojiSad className={styles.pageIcon} aria-hidden="true" />
      <h1 className={styles.pageHeadline}>The one that got away.</h1>
      <p className={styles.pageMessage}>{message}</p>
      {description && <p className={styles.pageDescription}>{description}</p>}
      {action && (
        <button type="button" className={styles.pageAction} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};

export default ErrorState;
