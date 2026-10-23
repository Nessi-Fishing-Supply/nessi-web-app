'use client';

import { useState, useRef, useCallback, useId, type ReactNode } from 'react';
import styles from './tooltip.module.scss';

interface TooltipProps {
  content: string;
  placement?: 'top' | 'bottom';
  children: ReactNode;
}

export default function Tooltip({ content, placement = 'top', children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const tooltipId = `tooltip-${id}`;

  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    hideTimer.current = setTimeout(() => setVisible(false), 80);
  }, []);

  const handleToggle = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  const truncated = content.length > 80 ? content.slice(0, 80) : content;

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span
        className={styles.trigger}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
          if (e.key === 'Escape') setVisible(false);
        }}
        aria-describedby={visible ? tooltipId : undefined}
      >
        {children}
      </span>
      {visible && (
        <span id={tooltipId} role="tooltip" className={`${styles.tooltip} ${styles[placement]}`}>
          {truncated}
          <span className={styles.arrow} aria-hidden="true" />
        </span>
      )}
    </span>
  );
}
