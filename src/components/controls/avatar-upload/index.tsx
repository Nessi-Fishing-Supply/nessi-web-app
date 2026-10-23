'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { HiCamera } from 'react-icons/hi';
import ImageCropper from '@/components/controls/image-cropper';
import Modal from '@/components/layout/modal';
import styles from './avatar-upload.module.scss';

interface AvatarUploadProps {
  name: string;
  avatarUrl: string | null;
  onUpload: (url: string) => void;
  disabled?: boolean;
  uploadUrl?: string;
  extraFormData?: Record<string, string>;
}

export default function AvatarUpload({
  name,
  avatarUrl,
  onUpload,
  disabled,
  uploadUrl,
  extraFormData,
}: AvatarUploadProps) {
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
      formData.append('file', croppedBlob, 'avatar.webp');

      if (extraFormData) {
        Object.entries(extraFormData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const response = await fetch(uploadUrl ?? '/api/members/avatar', {
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
        aria-label="Upload avatar photo"
        aria-busy={isUploading}
        disabled={disabled || isUploading}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt={name} fill sizes="120px" style={{ objectFit: 'cover' }} />
        ) : (
          <span className={styles.placeholder} aria-hidden="true">
            <HiCamera className={styles.placeholderIcon} />
            <span className={styles.placeholderText}>Upload photo</span>
          </span>
        )}

        {isUploading && (
          <span className={styles.spinnerOverlay} aria-hidden="true">
            <span className={styles.spinner} />
          </span>
        )}
      </button>

      <span className={styles.cameraIcon} aria-hidden="true">
        <HiCamera />
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handleFileChange}
        aria-label="Choose avatar image"
        tabIndex={-1}
      />

      <Modal isOpen={!!cropSource} onClose={handleCancelCrop} ariaLabel="Crop avatar image">
        {cropSource && (
          <ImageCropper
            imageSrc={cropSource}
            aspect={1}
            cropShape="round"
            onCrop={handleCrop}
            onCancel={handleCancelCrop}
            loading={isUploading}
          />
        )}
      </Modal>
    </div>
  );
}
