'use client';

import { memo, useCallback } from 'react';
import styles from './toggle.module.scss';

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

function Toggle({ id, checked, onChange, disabled = false, ariaLabel }: ToggleProps) {
  const handleClick = useCallback(() => {
    if (disabled) return;
    onChange(!checked);
  }, [disabled, checked, onChange]);

  return (
    <button
      id={id}
      type="button"
      role="switch"
      className={`${styles.track} ${checked ? styles.trackOn : ''}`}
      aria-checked={checked}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      onClick={handleClick}
    >
      <span className={styles.thumb} />
    </button>
  );
}

export default memo(Toggle);
