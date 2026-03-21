'use client';

import React from 'react';
import Image from 'next/image';
import { HiXMark, HiArrowPath } from 'react-icons/hi2';
import Pill from '@/components/indicators/pill';
import styles from './photo-manager.module.scss';

interface PhotoThumbnailProps {
  photo: {
    id: string;
    image_url: string;
    thumbnail_url: string | null;
  };
  index: number;
  total: number;
  isUploading: boolean;
  uploadProgress: number;
  hasError: boolean;
  onRetry: () => void;
  onDelete: () => void;
  isCover: boolean;
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
}

const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({
  photo,
  index,
  total,
  isUploading,
  uploadProgress,
  hasError,
  onRetry,
  onDelete,
  isCover,
  dragAttributes,
  dragListeners,
  setNodeRef,
  style,
}) => {
  const imageSrc = photo.thumbnail_url ?? photo.image_url;
  const tileAriaLabel = `Photo ${index + 1} of ${total}.${isCover ? ' Cover photo.' : ''} Press space to pick up.`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.thumbnail}${hasError ? ` ${styles.thumbnailError}` : ''}`}
      aria-roledescription="sortable"
      aria-label={tileAriaLabel}
      {...(dragAttributes as React.HTMLAttributes<HTMLDivElement>)}
      {...(dragListeners as React.HTMLAttributes<HTMLDivElement>)}
    >
      <div className={styles.thumbnailImage}>
        <Image
          src={imageSrc}
          alt={`Listing photo ${index + 1}`}
          fill
          sizes="(max-width: 768px) 80px, 120px"
          style={{ objectFit: 'cover' }}
        />
      </div>

      {isCover && (
        <div className={styles.coverBadge} aria-hidden="true">
          <Pill color="success">Cover</Pill>
        </div>
      )}

      {isUploading && (
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={uploadProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Upload progress"
        >
          <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {hasError && (
        <div className={styles.errorOverlay}>
          <button
            type="button"
            onClick={onRetry}
            aria-label={`Retry upload for photo ${index + 1}`}
            className={styles.retryButton}
          >
            <HiArrowPath aria-hidden="true" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete photo ${index + 1}`}
        className={styles.deleteButton}
      >
        <HiXMark aria-hidden="true" />
      </button>
    </div>
  );
};

export default PhotoThumbnail;
