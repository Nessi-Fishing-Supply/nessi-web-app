import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styles from './Modal.module.scss';
import { HiOutlineX } from 'react-icons/hi';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Close the modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close the modal when clicking outside of it
  const handleClickOutside = (event: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClickOutside],);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  // Render the modal content inside the portal
  return isOpen ? ReactDOM.createPortal(
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modalContent} ref={modalRef} tabIndex={-1}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
          <HiOutlineX />
        </button>
        {children}
      </div>
    </div>,
    document.getElementById('modal-root') as HTMLElement
  )
    : null;
};

export default Modal;
