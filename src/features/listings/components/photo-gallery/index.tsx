'use client';

import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Image from 'next/image';
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

  return (
    <div className={styles.gallery}>
      <Favorite className={styles.favorite} />
      <div className={styles.photoCount} aria-live="polite">
        {photos.length > 0 ? `${currentIndex + 1}/${photos.length}` : ''}
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
            <SwiperSlide key={photo.id || index} onClick={() => onPhotoTap(index)}>
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
