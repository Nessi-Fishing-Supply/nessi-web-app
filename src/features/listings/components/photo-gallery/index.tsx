'use client';

import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Image from 'next/image';
import { HiOutlinePhotograph } from 'react-icons/hi';
import Favorite from '@/components/controls/favorite';
import styles from './photo-gallery.module.scss';
import type { ListingPhoto } from '@/features/listings/types/listing-photo';

interface PhotoGalleryProps {
  photos: ListingPhoto[];
  title: string;
  onPhotoTap: (index: number) => void;
}

export default function PhotoGallery({ photos, title, onPhotoTap }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMultiple = photos.length > 1;

  // Empty state — no photos
  if (photos.length === 0) {
    return (
      <div className={styles.gallery} aria-label="No photos available">
        <Favorite className={styles.favorite} />
        <div className={styles.emptyState}>
          <HiOutlinePhotograph className={styles.emptyIcon} aria-hidden="true" />
          <span className={styles.emptyText}>No photos</span>
        </div>
      </div>
    );
  }

  // Single photo — no carousel needed
  if (!hasMultiple) {
    const photo = photos[0];
    return (
      <div className={styles.gallery}>
        <Favorite className={styles.favorite} />
        <div
          className={styles.slide}
          onClick={() => onPhotoTap(0)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onPhotoTap(0);
          }}
          aria-label={`View ${title} photo full screen`}
        >
          <Image
            src={photo.image_url}
            alt={`${title} photo`}
            fill
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 80vw, 600px"
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>
      </div>
    );
  }

  // Multiple photos — full Swiper carousel
  return (
    <div className={styles.gallery} aria-roledescription="carousel" aria-label="Listing photos">
      <Favorite className={styles.favorite} />
      <div className={styles.photoCount} aria-hidden="true">
        {currentIndex + 1}/{photos.length}
      </div>
      <Swiper
        className="swiper__listing-detail"
        modules={[Navigation, Pagination]}
        navigation
        pagination={{ clickable: true }}
        onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
      >
        {photos.map((photo, index) =>
          photo.image_url ? (
            <SwiperSlide
              key={photo.id || index}
              onClick={() => onPhotoTap(index)}
              role="group"
              aria-roledescription="slide"
              aria-label={`Photo ${index + 1} of ${photos.length}`}
            >
              <div className={styles.slide}>
                <Image
                  src={photo.image_url}
                  alt={`${title} photo ${index + 1}`}
                  fill
                  sizes="(max-width: 480px) 100vw, (max-width: 768px) 80vw, 600px"
                  style={{ objectFit: 'cover' }}
                  priority={index === 0}
                />
              </div>
            </SwiperSlide>
          ) : null,
        )}
      </Swiper>
    </div>
  );
}
