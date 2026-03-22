'use client';

import React, { useEffect } from 'react';
import styles from './product-card.module.scss';
import { useRouter } from 'next/navigation';
import Pill from '@/components/indicators/pill';
import Favorite from '@/features/products/components/favorite';
import ProductReviews from '@/features/products/components/product-reviews';
import ConditionBadge from '@/features/listings/components/condition-badge';
import { formatPrice } from '@/features/listings/utils/format';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Image from 'next/image';
import type { ProductWithImages } from '@/features/products/types/product';
import type { ListingWithPhotos } from '@/features/listings/types/listing';

type CardItem = ProductWithImages | ListingWithPhotos;

function isListing(item: CardItem): item is ListingWithPhotos {
  return 'price_cents' in item;
}

interface ProductCardProps {
  product: CardItem;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const router = useRouter();

  const price = isListing(product)
    ? formatPrice(product.price_cents)
    : typeof product.price === 'number'
      ? `$${product.price.toFixed(2)}`
      : `$${parseFloat(product.price).toFixed(2)}`;

  const images: { url: string | null; alt: string }[] = isListing(product)
    ? product.listing_photos.map((p) => ({ url: p.thumbnail_url || p.image_url, alt: product.title }))
    : product.product_images.map((p: { image_url: string | null }) => ({
        url: p.image_url,
        alt: product.title,
      }));

  const handleViewDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/item/${product.id}`);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const swiper = e.currentTarget.querySelector('.swiper__product-card');
    swiper?.classList.add('swiper-hovered');
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    const swiper = e.currentTarget.querySelector('.swiper__product-card');
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

  return (
    <a
      className={styles.card}
      onClick={handleViewDetails}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.carousel}>
        {isListing(product) ? (
          <span className={styles.conditionBadge}>
            <ConditionBadge condition={product.condition} size="sm" />
          </span>
        ) : (
          <Pill className={styles.pill} color="secondary">
            In Stock
          </Pill>
        )}
        <Favorite className={styles.favorite} />
        <Swiper
          className="swiper__product-card"
          modules={[Navigation, Pagination]}
          navigation
          pagination={{ clickable: true }}
        >
          {images.map((image, index) =>
            image.url ? (
              <SwiperSlide key={index}>
                <div className={styles.slide}>
                  <Image
                    src={image.url}
                    alt={`${image.alt} image ${index + 1}`}
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
        <p className={styles.title}>{product.title}</p>
        <div className={styles.priceSection}>
          <p className={styles.price}>{price}</p>
          <ProductReviews count={0} average={4.2} />
        </div>
        {isListing(product) && product.location_state && (
          <p className={styles.location}>
            {product.location_city ? `${product.location_city}, ` : ''}
            {product.location_state}
          </p>
        )}
      </div>
    </a>
  );
};

export default ProductCard;
