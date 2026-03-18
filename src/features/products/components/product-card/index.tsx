'use client';

import React, { useEffect } from 'react';
import styles from './product-card.module.scss';
import { useRouter } from 'next/navigation';
import Pill from '@/components/indicators/pill';
import { FaTruck, FaTag } from 'react-icons/fa';
import Favorite from '@/features/products/components/favorite';
import ProductReviews from '@/features/products/components/product-reviews';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Image from 'next/image';
import type { ProductWithImages } from '@/features/products/types/product';

interface ProductCardProps {
  product: ProductWithImages;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const router = useRouter();
  const price =
    typeof product.price === 'number'
      ? `$${product.price.toFixed(2)}`
      : `$${parseFloat(product.price).toFixed(2)}`;

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
        <Pill className={styles.pill} color="secondary">
          In Stock
        </Pill>
        <Favorite className={styles.favorite} />
        <Swiper
          className="swiper__product-card"
          modules={[Navigation, Pagination]}
          navigation
          pagination={{ clickable: true }}
        >
          {product.product_images.map((image, index) =>
            image.image_url ? (
              <SwiperSlide key={index}>
                <Image
                  src={image.image_url}
                  alt={`${product.title} image ${index + 1}`}
                  objectFit="cover"
                  width={300}
                  height={300}
                />
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
        <div className={styles.badgeWrapper}>
          <div className={styles.badge}>
            <FaTag className={styles.tagIcon} />
            <p>20% Off Sale</p>
          </div>
          <div className={styles.badge}>
            <FaTruck className={styles.truckIcon} />
            <p>Free Shipping</p>
          </div>
        </div>
      </div>
    </a>
  );
};

export default ProductCard;
