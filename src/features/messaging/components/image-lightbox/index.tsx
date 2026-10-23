'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import { HiOutlineX, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import type { ImageAttachment } from '@/features/messaging/types/message';
import styles from './image-lightbox.module.scss';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: ImageAttachment[];
  initialIndex?: number;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function ImageLightbox({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
}: ImageLightboxProps) {
  const lightboxRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Store triggering element and focus lightbox on open
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => lightboxRef.current?.focus());
    }
  }, [isOpen]);

  // Restore focus on close
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Escape key, arrow navigation, and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (images.length > 1) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          goToPrev();
          return;
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          goToNext();
          return;
        }
      }

      if (event.key === 'Tab' && lightboxRef.current) {
        const focusableElements = lightboxRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
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
  }, [isOpen, onClose, images.length, goToPrev, goToNext]);

  // Body scroll lock
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

  if (!isOpen) return null;

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  return ReactDOM.createPortal(
    <div
      className={styles.overlay}
      ref={lightboxRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <div className={styles.header}>
        {hasMultiple && (
          <span className={styles.counter} aria-live="polite" aria-atomic="true">
            {currentIndex + 1} / {images.length}
          </span>
        )}
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close image viewer"
          type="button"
        >
          <HiOutlineX aria-hidden="true" />
        </button>
      </div>

      <div className={styles.imageContainer}>
        {currentImage && (
          <Image
            src={currentImage.url}
            alt={currentImage.alt ?? `Image ${currentIndex + 1} of ${images.length}`}
            fill
            sizes="100vw"
            style={{ objectFit: 'contain' }}
            priority={currentIndex === 0}
          />
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              className={`${styles.nav} ${styles.navPrev}`}
              onClick={goToPrev}
              aria-label="Previous image"
            >
              <HiChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.nav} ${styles.navNext}`}
              onClick={goToNext}
              aria-label="Next image"
            >
              <HiChevronRight aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.getElementById('modal-root') as HTMLElement,
  );
}
