import { post } from '@/libs/fetch';
import { FetchError } from '@/libs/fetch-error';
import useContextStore from '@/features/context/stores/context-store';
import type { UploadResult } from '../types/listing-photo';

const UPLOAD_URL = '/api/listings/upload';
const DELETE_URL = '/api/listings/upload/delete';

export const uploadListingPhoto = async (file: File, listingId: string): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('listingId', listingId);
  return post<UploadResult>(UPLOAD_URL, formData);
};

export const deleteListingPhoto = async (
  imageUrl: string,
  thumbnailUrl: string,
): Promise<{ success: boolean }> => {
  const { activeContext } = useContextStore.getState();
  const contextHeader = activeContext.type === 'member' ? 'member' : `shop:${activeContext.shopId}`;

  const res = await fetch(DELETE_URL, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-Nessi-Context': contextHeader,
    },
    body: JSON.stringify({ imageUrl, thumbnailUrl }),
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData.error) message = errorData.error;
      else if (errorData.message) message = errorData.message;
    } catch {
      // Response body is not JSON — use default message
    }
    throw new FetchError(message, res.status);
  }

  return res.json();
};
