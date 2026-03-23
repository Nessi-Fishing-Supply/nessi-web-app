'use client';

import { useState } from 'react';
import styles from './listing-card.module.scss';
import { useRouter } from 'next/navigation';
import ConditionBadge from '@/features/listings/components/condition-badge';
import { formatPrice } from '@/features/shared/utils/format';
import Favorite from '@/components/controls/favorite';
import Reviews from '@/components/indicators/reviews';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Image from 'next/image';
import type { ListingWithPhotos } from '@/features/listings/types/listing';

interface ListingCardProps {
  listing: ListingWithPhotos;
  priority?: boolean;
}

export default function ListingCard({ listing, priority = false }: ListingCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleViewDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/listing/${listing.id}`);
  };

  const photos = listing.listing_photos ?? [];

  return (
    <a
      href={`/listing/${listing.id}`}
      className={styles.card}
      onClick={handleViewDetails}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={styles.carousel}>
        <span className={styles.conditionBadge}>
          <ConditionBadge condition={listing.condition} size="sm" />
        </span>
        <Favorite className={styles.favorite} />
        <Swiper
          className={`swiper__listing-card${isHovered ? ' swiper-hovered' : ''}`}
          modules={[Navigation, Pagination]}
          navigation
          pagination={{ clickable: true }}
          onClick={(_, e) => e?.stopPropagation()}
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
                    priority={priority && index === 0}
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
          <Reviews count={0} average={0} />
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
