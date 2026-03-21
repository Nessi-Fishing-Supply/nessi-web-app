'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { HiPhoto, HiCamera, HiPlus } from 'react-icons/hi2';
import Modal from '@/components/layout/modal';
import { useToast } from '@/components/indicators/toast/context';
import PhotoThumbnail from './photo-thumbnail';
import { uploadListingPhoto } from '../../services/listing-photo';
import type { ListingPhoto } from '../../types/listing-photo';
import styles from './photo-manager.module.scss';

interface PhotoManagerProps {
  listingId: string;
  photos: ListingPhoto[];
  onPhotosChange: (photos: ListingPhoto[]) => void;
  maxPhotos?: number;
  minPhotos?: number;
}

interface UploadEntry {
  progress: number;
  error: boolean;
  retryCount: number;
  file: File;
}

interface SortableItemRenderProps {
  setNodeRef: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
  dragAttributes: Record<string, unknown>;
  dragListeners: Record<string, unknown>;
}

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (props: SortableItemRenderProps) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div role="listitem">
      {children({
        setNodeRef,
        style,
        dragAttributes: attributes as unknown as Record<string, unknown>,
        dragListeners: listeners as Record<string, unknown>,
      })}
    </div>
  );
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_CONCURRENT_UPLOADS = 3;

export default function PhotoManager({
  listingId,
  photos,
  onPhotosChange,
  maxPhotos = 12,
  minPhotos = 2,
}: PhotoManagerProps) {
  const { showToast } = useToast();
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadEntry>>(new Map());
  const [isDragOver, setIsDragOver] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      // Validate each file before anything else
      const validFiles: File[] = [];
      for (const file of files) {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          showToast({
            message: 'Invalid file',
            description: 'Only JPEG, PNG, WebP, and HEIC images are accepted',
            type: 'error',
          });
          continue;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          showToast({
            message: 'File too large',
            description: 'Images must be under 20MB',
            type: 'error',
          });
          continue;
        }
        validFiles.push(file);
      }

      const available = maxPhotos - photos.length;
      if (available <= 0) return;

      if (validFiles.length > available) {
        showToast({
          message: 'Photo limit',
          description: `Maximum ${maxPhotos} photos allowed`,
          type: 'error',
        });
      }

      const filesToProcess = validFiles.slice(0, available);
      if (filesToProcess.length === 0) return;

      // Process in batches of MAX_CONCURRENT_UPLOADS
      for (let batch = 0; batch < filesToProcess.length; batch += MAX_CONCURRENT_UPLOADS) {
        const batchFiles = filesToProcess.slice(batch, batch + MAX_CONCURRENT_UPLOADS);

        await Promise.all(
          batchFiles.map(async (file, batchIndex) => {
            const photoIndex = photos.length + batch + batchIndex;
            const tempId = crypto.randomUUID();
            const objectUrl = URL.createObjectURL(file);

            const tempPhoto: ListingPhoto = {
              id: tempId,
              listing_id: listingId,
              image_url: objectUrl,
              thumbnail_url: null,
              position: photoIndex,
              created_at: new Date().toISOString(),
            };

            onPhotosChange([...photos, tempPhoto]);

            setUploadingFiles((prev) => {
              const next = new Map(prev);
              next.set(tempId, { progress: 0, error: false, retryCount: 0, file });
              return next;
            });

            try {
              const result = await uploadListingPhoto(file, listingId);
              URL.revokeObjectURL(objectUrl);
              onPhotosChange(
                photos.map((p) =>
                  p.id === tempId
                    ? {
                        ...p,
                        image_url: result.url,
                        thumbnail_url: result.thumbnailUrl,
                      }
                    : p,
                ),
              );
              setUploadingFiles((prev) => {
                const next = new Map(prev);
                next.delete(tempId);
                return next;
              });
            } catch {
              setUploadingFiles((prev) => {
                const next = new Map(prev);
                next.set(tempId, { progress: 0, error: true, retryCount: 0, file });
                return next;
              });
            }
          }),
        );
      }
    },
    [listingId, maxPhotos, onPhotosChange, photos, showToast],
  );

  const handleRetry = useCallback(
    (tempId: string) => {
      const entry = uploadingFiles.get(tempId);
      if (!entry || entry.retryCount >= 3) return;
      const newRetryCount = entry.retryCount + 1;

      setUploadingFiles((prev) => {
        const next = new Map(prev);
        next.set(tempId, { ...entry, error: false, retryCount: newRetryCount });
        return next;
      });

      uploadListingPhoto(entry.file, listingId)
        .then((result) => {
          onPhotosChange(
            photos.map((p) =>
              p.id === tempId
                ? {
                    ...p,
                    image_url: result.url,
                    thumbnail_url: result.thumbnailUrl,
                  }
                : p,
            ),
          );
          setUploadingFiles((prev) => {
            const next = new Map(prev);
            next.delete(tempId);
            return next;
          });
        })
        .catch(() => {
          setUploadingFiles((prev) => {
            const next = new Map(prev);
            next.set(tempId, { ...entry, error: true, retryCount: newRetryCount });
            return next;
          });
          if (newRetryCount >= 3) {
            showToast({
              message: 'Upload failed',
              description: 'Could not upload photo after multiple attempts',
              type: 'error',
            });
          }
        });
    },
    [uploadingFiles, listingId, onPhotosChange, photos, showToast],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(Array.from(e.target.files));
        e.target.value = '';
      }
    },
    [processFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) processFiles(files);
    },
    [processFiles],
  );

  const handleAddClick = useCallback(() => {
    if (isTouchDevice) {
      setShowBottomSheet(true);
    } else {
      fileInputRef.current?.click();
    }
  }, [isTouchDevice]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = photos.findIndex((p) => p.id === active.id);
      const newIndex = photos.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(photos, oldIndex, newIndex).map((p, idx) => ({
        ...p,
        position: idx,
      }));
      onPhotosChange(reordered);
    },
    [photos, onPhotosChange],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!showDeleteConfirm) return;

    // Warn if deleting a photo that was mid-upload — it may have partially
    // reached storage and can't be cleaned up client-side.
    const uploadEntry = uploadingFiles.get(showDeleteConfirm);
    if (uploadEntry) {
      showToast({
        message: 'Delete warning',
        description: 'Photo removed locally but may still exist in storage',
        type: 'error',
      });
    }

    const updated = photos
      .filter((p) => p.id !== showDeleteConfirm)
      .map((p, idx) => ({ ...p, position: idx }));
    onPhotosChange(updated);
    setShowDeleteConfirm(null);
  }, [showDeleteConfirm, photos, onPhotosChange, uploadingFiles, showToast]);

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className={styles.photoManager}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {photos.length === 0 ? (
        <div
          role="button"
          tabIndex={0}
          className={`${styles.dropZone}${isDragOver ? ` ${styles.dragOver}` : ''}`}
          onClick={handleAddClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleAddClick();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="Add photos — drag photos here or tap to upload"
        >
          <HiPhoto className={styles.dropZoneIcon} aria-hidden="true" />
          <span className={styles.dropZoneText}>Drag photos here or tap to upload</span>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div
              role="list"
              className={styles.grid}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {photos.map((photo, index) => {
                const uploadEntry = uploadingFiles.get(photo.id);
                const isUploading = !!uploadEntry && !uploadEntry.error;
                const hasError = !!uploadEntry?.error;
                const canRetry = hasError && (uploadEntry?.retryCount ?? 0) < 3;

                return (
                  <SortableItem key={photo.id} id={photo.id}>
                    {({ setNodeRef, style, dragAttributes, dragListeners }) => (
                      <PhotoThumbnail
                        photo={photo}
                        index={index}
                        total={photos.length}
                        isUploading={isUploading}
                        uploadProgress={uploadEntry?.progress ?? 0}
                        hasError={hasError && !canRetry ? false : hasError}
                        onRetry={() => handleRetry(photo.id)}
                        onDelete={() => setShowDeleteConfirm(photo.id)}
                        isCover={photo.position === 0}
                        setNodeRef={setNodeRef}
                        style={style}
                        dragAttributes={dragAttributes}
                        dragListeners={dragListeners}
                      />
                    )}
                  </SortableItem>
                );
              })}

              {canAddMore && (
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={handleAddClick}
                  aria-label="Add more photos"
                >
                  <HiPlus className={styles.addButtonIcon} aria-hidden="true" />
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {photos.length < minPhotos && (
        <p className={styles.minPhotosHint} role="status" aria-live="polite">
          At least {minPhotos} photos recommended
        </p>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        ariaLabel="Delete photo confirmation"
      >
        <p>Delete this photo?</p>
        <button type="button" onClick={() => setShowDeleteConfirm(null)}>
          Cancel
        </button>
        <button type="button" onClick={handleDeleteConfirm}>
          Delete
        </button>
      </Modal>

      {/* Mobile bottom sheet for photo source */}
      <Modal
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        ariaLabel="Choose photo source"
      >
        <div className={styles.bottomSheet}>
          <button
            type="button"
            className={styles.bottomSheetOption}
            onClick={() => {
              setShowBottomSheet(false);
              cameraInputRef.current?.click();
            }}
          >
            <HiCamera className={styles.bottomSheetIcon} aria-hidden="true" />
            Take photo
          </button>
          <button
            type="button"
            className={styles.bottomSheetOption}
            onClick={() => {
              setShowBottomSheet(false);
              fileInputRef.current?.click();
            }}
          >
            <HiPhoto className={styles.bottomSheetIcon} aria-hidden="true" />
            Choose from library
          </button>
        </div>
      </Modal>
    </div>
  );
}
