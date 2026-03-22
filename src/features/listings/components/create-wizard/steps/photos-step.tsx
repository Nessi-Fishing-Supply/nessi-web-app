'use client';

import { useState, useId } from 'react';
import { HiOutlineQuestionMarkCircle } from 'react-icons/hi2';

import Modal from '@/components/layout/modal';
import PhotoManager from '@/features/listings/components/photo-manager';
import type { WizardPhoto } from '@/features/listings/stores/wizard-photo-store';

import styles from './photos-step.module.scss';

const PHOTO_GUIDANCE_TIPS = [
  'Use natural lighting — outdoors or near a window works best.',
  'Include photos from multiple angles: front, back, sides, and bottom.',
  'Show any wear, scratches, or imperfections clearly — honesty builds trust.',
  'Place the item against a plain, neutral background to reduce distractions.',
  'The first photo becomes your cover image, so make it your best shot.',
  'For rods and reels, photograph the grip, guides, and hardware up close.',
];

interface PhotosStepProps {
  photos: WizardPhoto[];
  onPhotosChange: (photos: WizardPhoto[]) => void;
  onPhotosAdd: (files: File[]) => void;
  onPhotoRemove: (id: string) => void;
}

export default function PhotosStep({
  photos,
  onPhotosChange,
  onPhotosAdd,
  onPhotoRemove,
}: PhotosStepProps) {
  const [showGuidance, setShowGuidance] = useState(false);
  const guidanceTitleId = useId();

  return (
    <div className={styles.photosStep}>
      <div className={styles.header}>
        <h2 className={styles.title}>Add photos</h2>
        <button
          type="button"
          className={styles.guidanceButton}
          onClick={() => setShowGuidance(true)}
          aria-label="Photo tips"
        >
          <HiOutlineQuestionMarkCircle aria-hidden="true" />
        </button>
      </div>

      {photos.length < 2 && (
        <p className={styles.minPhotosHint} role="status" aria-live="polite">
          Add at least 2 photos
        </p>
      )}

      <PhotoManager
        photos={photos}
        onPhotosChange={onPhotosChange}
        onPhotosAdd={onPhotosAdd}
        onPhotoRemove={onPhotoRemove}
        minPhotos={2}
      />

      <Modal
        isOpen={showGuidance}
        onClose={() => setShowGuidance(false)}
        ariaLabelledBy={guidanceTitleId}
      >
        <h3 id={guidanceTitleId} className={styles.guidanceTitle}>
          Photo tips
        </h3>
        <ul className={styles.guidanceList}>
          {PHOTO_GUIDANCE_TIPS.map((tip) => (
            <li key={tip} className={styles.guidanceTip}>
              {tip}
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
