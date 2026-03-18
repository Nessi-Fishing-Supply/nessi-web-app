import React from 'react';
import styles from './product-reviews.module.scss';
import { FaStar, FaRegStar } from 'react-icons/fa';

interface ProductReviewsProps {
  count: number;
  average: number;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ count, average }) => {
  return (
    <div className={styles.reviews}>
      <div className={styles.stars}>
        {/* Placeholder stars */}
        <FaStar />
        <FaStar />
        <FaStar />
        <FaStar />
        <FaRegStar />
      </div>
      <p className={styles.text}>
        {average.toFixed(1)} ({count} reviews)
      </p>
    </div>
  );
};

export default ProductReviews;
