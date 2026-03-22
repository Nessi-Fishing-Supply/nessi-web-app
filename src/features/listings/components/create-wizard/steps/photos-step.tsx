'use client';

import { useEffect, useRef, useState, useId } from 'react';
import { HiOutlineQuestionMarkCircle } from 'react-icons/hi2';

import Modal from '@/components/layout/modal';
import PhotoManager from '@/features/listings/components/photo-manager';
import { useCreateDraft } from '@/features/listings/hooks/use-listings';
import useCreateWizardStore from '@/features/listings/stores/create-wizard-store';
import type { ListingPhoto } from '@/features/listings/types/listing-photo';

import styles from './photos-step.module.scss';

const PHOTO_GUIDANCE_TIPS = [
  'Use natural lighting — outdoors or near a window works best.',
  'Include photos from multiple angles: front, back, sides, and bottom.',
  'Show any wear, scratches, or imperfections clearly — honesty builds trust.',
  'Place the item against a plain, neutral background to reduce distractions.',
  'The first photo becomes your cover image, so make it your best shot.',
  'For rods and reels, photograph the grip, guides, and hardware up close.',
];

export default function PhotosStep() {
  const listingId = useCreateWizardStore.use.listingId();
  const photos = useCreateWizardStore.use.photos();
  const setField = useCreateWizardStore.use.setField();

  const [showGuidance, setShowGuidance] = useState(false);

  const createDraft = useCreateDraft();
  const guidanceTitleId = useId();
  const draftCreatedRef = useRef(false);

  // Auto-create draft on mount so PhotoManager has a real listingId.
  // Uses listingId from the React selector (not getState) so it
  // re-runs after Zustand rehydrates from localStorage.
  useEffect(() => {
    if (listingId || draftCreatedRef.current) return;
    draftCreatedRef.current = true;

    createDraft
      .mutateAsync()
      .then((draft) => {
        setField('listingId', draft.id);
        setField('draftId', draft.id);
      })
      .catch(() => {
        draftCreatedRef.current = false;
      });
  }, [listingId, createDraft, setField]);

  function handlePhotosChange(updated: ListingPhoto[]) {
    setField('photos', updated);
  }

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

      {listingId ? (
        <PhotoManager
          listingId={listingId}
          photos={photos}
          onPhotosChange={handlePhotosChange}
          minPhotos={2}
        />
      ) : (
        <div className={styles.loadingPlaceholder}>
          <p className={styles.loadingText}>Preparing upload...</p>
        </div>
      )}

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
