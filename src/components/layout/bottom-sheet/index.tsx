'use client';

import React, { useEffect, useRef, useCallback, useId } from 'react';
import ReactDOM from 'react-dom';
import styles from './bottom-sheet.module.scss';

interface BottomSheetCta {
  label: string;
  onClick: () => void;
}

interface BottomSheetProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  cta?: BottomSheetCta;
  children: React.ReactNode;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function BottomSheet({
  title,
  isOpen,
  onClose,
  cta,
  children,
  className,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => sheetRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab' && sheetRef.current) {
        const focusableElements = sheetRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleScrimClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const portalTarget =
    typeof document !== 'undefined'
      ? (document.getElementById('modal-root') ?? document.body)
      : null;

  if (!portalTarget) return null;

  return ReactDOM.createPortal(
    <div
      className={`${styles.scrim} ${isOpen ? styles.scrimVisible : ''}`}
      onClick={handleScrimClick}
      aria-hidden={!isOpen}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`${styles.sheet} ${isOpen ? styles.sheetOpen : ''} ${className ?? ''}`}
      >
        <div className={styles.handle} aria-hidden="true" />
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
        </div>
        <div className={styles.body}>{children}</div>
        {cta && (
          <div className={styles.footer}>
            <button type="button" className={styles.ctaButton} onClick={cta.onClick}>
              {cta.label}
            </button>
          </div>
        )}
      </div>
    </div>,
    portalTarget,
  );
}
