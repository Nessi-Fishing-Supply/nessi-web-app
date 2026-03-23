import React from 'react';
import { HiLocationMarker } from 'react-icons/hi';
import styles from './location-chip.module.scss';

interface LocationChipProps {
  location: string;
  variant?: 'inline' | 'pill' | 'pickup';
  className?: string;
}

const LocationChip: React.FC<LocationChipProps> = ({ location, variant = 'inline', className }) => {
  return (
    <span className={`${styles.root} ${styles[variant]} ${className ?? ''}`}>
      <HiLocationMarker className={styles.icon} aria-hidden="true" />
      <span>{location}</span>
    </span>
  );
};

export default LocationChip;
