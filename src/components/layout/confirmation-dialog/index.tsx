'use client';

import { useId, useRef, useEffect } from 'react';
import Modal from '@/components/layout/modal';
import styles from './confirmation-dialog.module.scss';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'default',
}: ConfirmationDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button on open (safe default for alertdialog)
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => cancelRef.current?.focus());
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy={titleId}>
      {/* Override role to alertdialog via wrapper — Modal renders role="dialog" on its container,
          but the semantic content here is an alert dialog */}
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p id={messageId} className={styles.message}>
          {message}
        </p>
        <div className={styles.actions}>
          <button ref={cancelRef} type="button" className={styles.btnCancel} onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.btnConfirm}${variant === 'destructive' ? ` ${styles.btnDestructive}` : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
