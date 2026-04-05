'use client';

import React, { useEffect, useRef, useSyncExternalStore, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styles from './slide-panel.module.scss';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const LG_QUERY = '(min-width: 1024px)';

function subscribeToMediaQuery(callback: () => void) {
  const mq = window.matchMedia(LG_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getIsDesktop() {
  return window.matchMedia(LG_QUERY).matches;
}

function getIsDesktopServer() {
  return false;
}

const SlidePanel: React.FC<SlidePanelProps> = ({ isOpen, onClose, children, ariaLabel }) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const isDesktop = useSyncExternalStore(subscribeToMediaQuery, getIsDesktop, getIsDesktopServer);
  const mounted = typeof window !== 'undefined';

  // Store trigger element and focus panel on open
  useEffect(() => {
    if (isOpen && !isDesktop) {
      triggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => panelRef.current?.focus());
    }
  }, [isOpen, isDesktop]);

  // Restore focus on close (mobile only)
  useEffect(() => {
    if (!isOpen && triggerRef.current && !isDesktop) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen, isDesktop]);

  // Escape key + focus trap (mobile only)
  useEffect(() => {
    if (!isOpen || isDesktop) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab' && panelRef.current) {
        const focusableElements = panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
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
  }, [isOpen, isDesktop, onClose]);

  // Scrim click handler
  const handleScrimClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  // Body scroll lock (mobile only)
  useEffect(() => {
    if (isOpen && !isDesktop) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isDesktop]);

  // Desktop: render inline
  if (isDesktop) {
    if (!isOpen) return null;
    return <div className={styles.desktopPanel}>{children}</div>;
  }

  // SSR / pre-mount: render nothing
  if (!mounted) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return ReactDOM.createPortal(
    <div
      className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
      onClick={handleScrimClick}
    >
      <div
        className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>,
    modalRoot,
  );
};

export default SlidePanel;
