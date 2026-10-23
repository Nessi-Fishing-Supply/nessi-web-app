'use client';

import { useEffect, useMemo } from 'react';
import { HiOutlineX, HiPaperAirplane } from 'react-icons/hi';
import styles from './image-preview-strip.module.scss';

interface ImagePreviewStripProps {
  files: File[];
  onRemove: (index: number) => void;
  onSend: () => void;
  isPending: boolean;
  maxFiles?: number;
}

export default function ImagePreviewStrip({
  files,
  onRemove,
  onSend,
  isPending,
  maxFiles = 4,
}: ImagePreviewStripProps) {
  const objectUrls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [objectUrls]);

  if (files.length === 0) return null;

  return (
    <div className={styles.strip} role="region" aria-label="Selected images">
      <ul className={styles.thumbnailList}>
        {files.map((file, index) => {
          const url = objectUrls[index];
          return (
            <li key={`${file.name}-${index}`} className={styles.thumbnailItem}>
              <div className={styles.thumbnail}>
                {url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={file.name} className={styles.thumbnailImg} />
                )}
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => onRemove(index)}
                  aria-label="Remove image"
                >
                  <HiOutlineX aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className={styles.actions}>
        <span
          className={styles.count}
          aria-label={`${files.length} of ${maxFiles} images selected`}
        >
          {files.length}/{maxFiles}
        </span>

        <button
          type="button"
          className={styles.sendBtn}
          onClick={onSend}
          disabled={isPending}
          aria-busy={isPending}
          aria-label="Send images"
        >
          <HiPaperAirplane aria-hidden="true" className={styles.sendIcon} />
        </button>
      </div>
    </div>
  );
}
