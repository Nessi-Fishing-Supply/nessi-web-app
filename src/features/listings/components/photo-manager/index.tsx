'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import type { WizardPhoto } from '../../stores/wizard-photo-store';
import styles from './photo-manager.module.scss';

interface PhotoManagerProps {
  photos: WizardPhoto[];
  onPhotosChange: (photos: WizardPhoto[]) => void;
  onPhotosAdd: (files: File[]) => void;
  onPhotoRemove: (id: string) => void;
  maxPhotos?: number;
  minPhotos?: number;
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
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export default function PhotoManager({
  photos,
  onPhotosChange,
  onPhotosAdd,
  onPhotoRemove,
  maxPhotos = 12,
  minPhotos = 2,
}: PhotoManagerProps) {
  const { showToast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const processFiles = useCallback(
    (files: File[]) => {
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

      const available = maxPhotos - photosRef.current.length;
      if (available <= 0) return;

      if (validFiles.length > available) {
        showToast({
          message: 'Photo limit',
          description: `Maximum ${maxPhotos} photos allowed`,
          type: 'error',
        });
      }

      const filesToAdd = validFiles.slice(0, available);
      if (filesToAdd.length > 0) {
        onPhotosAdd(filesToAdd);
      }
    },
    [maxPhotos, showToast, onPhotosAdd],
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

      const oldIndex = photosRef.current.findIndex((p) => p.id === active.id);
      const newIndex = photosRef.current.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(photosRef.current, oldIndex, newIndex).map((p, idx) => ({
        ...p,
        position: idx,
      }));
      onPhotosChange(reordered);
    },
    [onPhotosChange],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!showDeleteConfirm) return;
    onPhotoRemove(showDeleteConfirm);
    setShowDeleteConfirm(null);
  }, [showDeleteConfirm, onPhotoRemove]);

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className={styles.photoManager}>
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
          <span className={styles.dropZoneHint}>JPEG, PNG, WebP, or HEIC — 20MB max per photo</span>
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
              {photos.map((photo, index) => (
                <SortableItem key={photo.id} id={photo.id}>
                  {({ setNodeRef, style, dragAttributes, dragListeners }) => (
                    <PhotoThumbnail
                      photo={{
                        id: photo.id,
                        image_url: photo.previewUrl,
                        thumbnail_url: null,
                      }}
                      index={index}
                      total={photos.length}
                      isUploading={false}
                      uploadProgress={0}
                      hasError={false}
                      onRetry={() => {}}
                      onDelete={() => setShowDeleteConfirm(photo.id)}
                      isCover={index === 0}
                      setNodeRef={setNodeRef}
                      style={style}
                      dragAttributes={dragAttributes}
                      dragListeners={dragListeners}
                    />
                  )}
                </SortableItem>
              ))}

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
