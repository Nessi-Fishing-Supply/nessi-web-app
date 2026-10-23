import React from 'react';
import styles from './reviews.module.scss';
import { FaStar, FaRegStar } from 'react-icons/fa';

interface ReviewsProps {
  count: number;
  average: number;
}

const Reviews: React.FC<ReviewsProps> = ({ count, average }) => {
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

export default Reviews;
