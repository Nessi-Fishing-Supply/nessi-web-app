// components/controls/Button.tsx
import React from 'react';
import styles from './button.module.scss';

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  style?: 'primary' | 'secondary' | 'dark' | 'light' | 'danger';
  fullWidth?: boolean;
  round?: boolean;
  outline?: boolean;
  marginBottom?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  loader?: React.ReactNode;
  ariaLabel?: string;
};

export default function Button({
  children,
  onClick,
  type = 'button',
  style = 'primary',
  fullWidth = false,
  round = false,
  outline = false,
  disabled = false,
  marginBottom = false,
  icon = null,
  iconPosition = 'right',
  loading = false,
  loader = <span className={styles.loader}></span>, // Default loader spinner
  ariaLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  // Determine if loader should be rendered
  const renderLoader = loading && loader;

  // Determine the button's content based on loading, icon, and iconPosition
  const buttonContent = (
    <>
      {/* Loader or icon on the left if iconPosition is 'left' */}
      {renderLoader && iconPosition === 'left' && <span className={styles.icon}>{loader}</span>}
      {!renderLoader && icon && iconPosition === 'left' && (
        <span className={styles.icon}>{icon}</span>
      )}

      {/* Button text */}
      {children}

      {/* Loader or icon on the right if no iconPosition is specified or it's 'right' */}
      {renderLoader && iconPosition === 'right' && <span className={styles.icon}>{loader}</span>}
      {!renderLoader && icon && iconPosition === 'right' && (
        <span className={styles.icon}>{icon}</span>
      )}
    </>
  );

  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        ${styles[style]}
        ${outline ? styles.outline : ''}
        ${round ? styles.round : ''}
        ${fullWidth ? styles.fullWidth : ''}
        ${marginBottom ? styles.marginBottom : ''}
      `}
      disabled={isDisabled}
      aria-busy={loading}
      aria-label={ariaLabel || undefined}
    >
      {buttonContent}
    </button>
  );
}
