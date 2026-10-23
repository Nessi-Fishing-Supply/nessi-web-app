'use client';

import Image from 'next/image';

import type { ImageAttachment } from '@/features/messaging/types/message';

import styles from './message-node.module.scss';

interface ImageNodeProps {
  images: ImageAttachment[];
  onImageClick: (index: number) => void;
}

export default function ImageNode({ images, onImageClick }: ImageNodeProps) {
  const count = images.length;

  const gridClass =
    count === 1
      ? styles.imageGridSingle
      : count === 2
        ? styles.imageGridDouble
        : styles.imageGridQuad;

  const cellClass = count === 1 ? styles.imageCellWide : styles.imageCell;
  const sizes = count === 1 ? '(max-width: 480px) 100vw, 280px' : '(max-width: 480px) 50vw, 140px';

  return (
    <div className={`${styles.imageGrid} ${gridClass}`}>
      {images.slice(0, 4).map((image, index) => (
        <button
          key={index}
          type="button"
          className={cellClass}
          onClick={() => onImageClick(index)}
          aria-label={`View image ${index + 1} of ${Math.min(count, 4)}`}
        >
          <Image
            src={image.url}
            alt={image.alt ?? `Image ${index + 1}`}
            fill
            sizes={sizes}
            style={{ objectFit: 'cover' }}
            priority={index === 0}
          />
        </button>
      ))}
    </div>
  );
}
