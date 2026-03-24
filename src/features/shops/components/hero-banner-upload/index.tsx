'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { HiPhotograph } from 'react-icons/hi';
import ImageCropper from '@/components/controls/image-cropper';
import Modal from '@/components/layout/modal';
import styles from './hero-banner-upload.module.scss';

interface HeroBannerUploadProps {
  shopId: string;
  heroBannerUrl: string | null;
  onUpload: (url: string) => void;
  disabled?: boolean;
}

export default function HeroBannerUpload({
  shopId,
  heroBannerUrl,
  onUpload,
  disabled,
}: HeroBannerUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setCropSource(objectUrl);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleCrop = async (croppedBlob: Blob) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', croppedBlob, 'hero-banner.webp');
      formData.append('shopId', shopId);

      const response = await fetch('/api/shops/hero-banner', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onUpload(data.url);
    } finally {
      setIsUploading(false);
      handleCancelCrop();
    }
  };

  const handleCancelCrop = () => {
    if (cropSource) {
      URL.revokeObjectURL(cropSource);
    }
    setCropSource(null);
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        onClick={handleButtonClick}
        aria-label="Upload hero banner photo"
        aria-busy={isUploading}
        disabled={disabled || isUploading}
      >
        {heroBannerUrl ? (
          <>
            <Image
              src={heroBannerUrl}
              alt="Shop hero banner"
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              style={{ objectFit: 'cover' }}
            />
            <span className={styles.hoverOverlay} aria-hidden="true">
              <HiPhotograph className={styles.hoverIcon} />
              <span className={styles.hoverText}>Change banner</span>
            </span>
          </>
        ) : (
          <span className={styles.placeholder} aria-hidden="true">
            <HiPhotograph className={styles.placeholderIcon} />
            <span className={styles.placeholderText}>Upload banner</span>
          </span>
        )}

        {isUploading && (
          <span className={styles.spinnerOverlay} aria-hidden="true">
            <span className={styles.spinner} />
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handleFileChange}
        aria-label="Choose hero banner image"
        tabIndex={-1}
      />

      <Modal isOpen={!!cropSource} onClose={handleCancelCrop} ariaLabel="Crop hero banner image">
        {cropSource && (
          <ImageCropper
            imageSrc={cropSource}
            aspect={3}
            cropShape="rect"
            onCrop={handleCrop}
            onCancel={handleCancelCrop}
            loading={isUploading}
          />
        )}
      </Modal>
    </div>
  );
}
