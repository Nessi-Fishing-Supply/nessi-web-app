'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import Button from '@/components/controls/button';
import cropImage from './crop-image';
import styles from './image-cropper.module.scss';

interface ImageCropperProps {
  imageSrc: string;
  aspect?: number;
  cropShape?: 'rect' | 'round';
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ImageCropper({
  imageSrc,
  aspect = 1,
  cropShape = 'rect',
  onCrop,
  onCancel,
  loading = false,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;

    const blob = await cropImage(imageSrc, {
      x: croppedAreaPixels.x,
      y: croppedAreaPixels.y,
      width: croppedAreaPixels.width,
      height: croppedAreaPixels.height,
    });

    onCrop(blob);
  };

  return (
    <div className={styles.container} role="dialog" aria-label="Crop image">
      <div className={styles.cropArea}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={cropShape}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={cropShape === 'rect'}
        />
      </div>

      <div className={styles.controls}>
        <label htmlFor="zoom-slider" className={styles.zoomLabel}>
          Zoom
        </label>
        <input
          id="zoom-slider"
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className={styles.slider}
          aria-label="Zoom level"
        />
      </div>

      <div className={styles.actions}>
        <Button style="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button style="primary" onClick={handleConfirm} loading={loading} disabled={loading}>
          Apply
        </Button>
      </div>
    </div>
  );
}
