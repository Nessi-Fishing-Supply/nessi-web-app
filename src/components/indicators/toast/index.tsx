'use client';

import React, { useEffect } from 'react';
import styles from './toast.module.scss';
import { HiCheck, HiExclamation, HiX } from 'react-icons/hi';

interface ToastProps {
  message: string;
  description: string;
  subtitle?: string;
  type: 'success' | 'error';
  duration?: number;
  onDismiss?: () => void;
  visible: boolean;
}

const Toast: React.FC<ToastProps> = ({
  message,
  description,
  subtitle,
  type,
  duration = 8000,
  onDismiss,
  visible,
}) => {
  useEffect(() => {
    if (!visible || !onDismiss) return;

    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  const Icon = type === 'success' ? HiCheck : HiExclamation;

  return (
    <div
      className={styles.overlay}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div className={`${styles.toast} ${styles[type]}`}>
        <div
          className={`${styles.icon} ${type === 'success' ? styles.iconSuccess : styles.iconError}`}
        >
          <Icon aria-hidden="true" />
        </div>
        <div className={styles.body}>
          <p
            className={`${styles.message} ${type === 'success' ? styles.messageSuccess : styles.messageError}`}
          >
            {message}
          </p>
          <p
            className={`${styles.description} ${type === 'success' ? styles.descriptionSuccess : styles.descriptionError}`}
          >
            {description}
          </p>
          {subtitle && (
            <p
              className={`${styles.subtitle} ${type === 'success' ? styles.subtitleSuccess : styles.subtitleError}`}
            >
              {subtitle}
            </p>
          )}
        </div>
        {onDismiss && (
          <button className={styles.close} onClick={onDismiss} aria-label="Dismiss notification">
            <HiX aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
