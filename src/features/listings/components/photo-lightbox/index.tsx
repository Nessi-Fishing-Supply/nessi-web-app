'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import { HiOutlineX } from 'react-icons/hi';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import type { ListingPhoto } from '../../types/listing-photo';
import styles from './photo-lightbox.module.scss';

interface PhotoLightboxProps {
  photos: ListingPhoto[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function PhotoLightbox({
  photos,
  initialIndex,
  isOpen,
  onClose,
  title,
}: PhotoLightboxProps) {
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

  // Escape key + focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
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
  }, [isOpen, onClose]);

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

  return ReactDOM.createPortal(
    <div
      className={styles.overlay}
      ref={lightboxRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo viewer: ${title}`}
    >
      <div className={styles.header}>
        <span className={styles.photoCount} aria-live="polite" aria-atomic="true">
          {currentIndex + 1} / {photos.length}
        </span>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close photo viewer"
          type="button"
        >
          <HiOutlineX aria-hidden="true" />
        </button>
      </div>

      <div className={styles.swiperWrapper}>
        <Swiper
          key={initialIndex}
          modules={[Navigation]}
          navigation
          initialSlide={initialIndex}
          onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
          onSwiper={(swiper) => setCurrentIndex(swiper.activeIndex)}
          className="swiper__lightbox"
          loop={false}
        >
          {photos.map((photo, index) => (
            <SwiperSlide key={photo.id}>
              <div className={styles.slide}>
                <Image
                  src={photo.image_url}
                  alt={`${title} — photo ${index + 1} of ${photos.length}`}
                  fill
                  style={{ objectFit: 'contain' }}
                  sizes="100vw"
                  priority={index === initialIndex}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>,
    document.getElementById('modal-root') as HTMLElement,
  );
}
