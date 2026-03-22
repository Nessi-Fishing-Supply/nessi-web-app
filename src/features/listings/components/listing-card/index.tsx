'use client';

import React, { useEffect } from 'react';
import styles from './listing-card.module.scss';
import { useRouter } from 'next/navigation';
import ConditionBadge from '@/features/listings/components/condition-badge';
import { formatPrice } from '@/features/listings/utils/format';
import Favorite from '@/features/products/components/favorite';
import ProductReviews from '@/features/products/components/product-reviews';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Image from 'next/image';
import type { ListingWithPhotos } from '@/features/listings/types/listing';

interface ListingCardProps {
  listing: ListingWithPhotos;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter();

  const handleViewDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/item/${listing.id}`);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const swiper = e.currentTarget.querySelector('.swiper__listing-card');
    swiper?.classList.add('swiper-hovered');
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    const swiper = e.currentTarget.querySelector('.swiper__listing-card');
    swiper?.classList.remove('swiper-hovered');
  };

  useEffect(() => {
    const stop = (e: Event) => e.stopPropagation();
    const buttons = document.querySelectorAll('.swiper-button-prev, .swiper-button-next');
    const bullets = document.querySelectorAll('.swiper-pagination-bullet');

    buttons.forEach((btn) => btn.addEventListener('click', stop));
    bullets.forEach((bullet) => bullet.addEventListener('click', stop));

    return () => {
      buttons.forEach((btn) => btn.removeEventListener('click', stop));
      bullets.forEach((bullet) => bullet.removeEventListener('click', stop));
    };
  }, []);

  const photos = listing.listing_photos ?? [];

  return (
    <a
      className={styles.card}
      onClick={handleViewDetails}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.carousel}>
        <span className={styles.conditionBadge}>
          <ConditionBadge condition={listing.condition} size="sm" />
        </span>
        <Favorite className={styles.favorite} />
        <Swiper
          className="swiper__listing-card"
          modules={[Navigation, Pagination]}
          navigation
          pagination={{ clickable: true }}
        >
          {photos.map((photo, index) =>
            photo.thumbnail_url || photo.image_url ? (
              <SwiperSlide key={photo.id || index}>
                <div className={styles.slide}>
                  <Image
                    src={photo.thumbnail_url || photo.image_url}
                    alt={`${listing.title} image ${index + 1}`}
                    fill
                    sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 300px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              </SwiperSlide>
            ) : null,
          )}
        </Swiper>
      </div>
      <div className={styles.contentWrapper}>
        <p className={styles.title}>{listing.title}</p>
        <div className={styles.priceSection}>
          <p className={styles.price}>{formatPrice(listing.price_cents)}</p>
          <ProductReviews count={0} average={0} />
        </div>
        {listing.location_state && (
          <p className={styles.location}>
            {listing.location_city ? `${listing.location_city}, ` : ''}
            {listing.location_state}
          </p>
        )}
      </div>
    </a>
  );
}
