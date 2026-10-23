import { useMutation } from '@tanstack/react-query';
import { uploadListingPhoto, deleteListingPhoto } from '../services/listing-photo';
import type { UploadResult } from '../types/listing-photo';

export function useUploadListingPhoto() {
  return useMutation<UploadResult, Error, { file: File; listingId: string }>({
    mutationFn: ({ file, listingId }) => uploadListingPhoto(file, listingId),
  });
}

export function useDeleteListingPhoto() {
  return useMutation<{ success: boolean }, Error, { imageUrl: string; thumbnailUrl: string }>({
    mutationFn: ({ imageUrl, thumbnailUrl }) => deleteListingPhoto(imageUrl, thumbnailUrl),
  });
}
