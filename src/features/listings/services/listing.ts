import { get, post, put, del, patch } from '@/libs/fetch';
import type { ListingWithPhotos, Listing } from '@/features/listings/types/listing';

const BASE_URL = '/api/listings';

export interface ListingFilters {
  category?: string;
  condition?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'watched';
  page?: number;
  limit?: number;
}

export interface PaginatedListings {
  listings: ListingWithPhotos[];
  total: number;
  page: number;
  limit: number;
}

function buildQueryString(filters: ListingFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.condition) params.set('condition', filters.condition);
  if (filters.search) params.set('search', filters.search);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const str = params.toString();
  return str ? `?${str}` : '';
}

export const getListings = async (filters: ListingFilters = {}): Promise<PaginatedListings> =>
  get<PaginatedListings>(`${BASE_URL}${buildQueryString(filters)}`);

export const getListingById = async (id: string): Promise<ListingWithPhotos> =>
  get<ListingWithPhotos>(`${BASE_URL}/${id}`);

export const getSellerListings = async (status?: string): Promise<ListingWithPhotos[]> =>
  get<ListingWithPhotos[]>(`${BASE_URL}/seller${status ? `?status=${status}` : ''}`);

export const getDrafts = async (): Promise<ListingWithPhotos[]> =>
  get<ListingWithPhotos[]>(`${BASE_URL}/drafts`);

export const createListing = async (data: Record<string, unknown>): Promise<ListingWithPhotos> =>
  post<ListingWithPhotos>(BASE_URL, data);

export const createDraft = async (): Promise<ListingWithPhotos> =>
  post<ListingWithPhotos>(`${BASE_URL}/drafts`);

export const updateListing = async (
  id: string,
  data: Record<string, unknown>,
): Promise<ListingWithPhotos> => put<ListingWithPhotos>(`${BASE_URL}/${id}`, data);

export const deleteListing = async (id: string): Promise<{ success: boolean }> =>
  del<{ success: boolean }>(`${BASE_URL}/${id}`);

export const deleteDraft = async (id: string): Promise<{ success: boolean }> =>
  del<{ success: boolean }>(`${BASE_URL}/drafts?id=${id}`);

export const updateListingStatus = async (
  id: string,
  status: string,
  sold_price_cents?: number,
): Promise<ListingWithPhotos> =>
  patch<ListingWithPhotos>(`${BASE_URL}/${id}/status`, {
    status,
    ...(sold_price_cents !== undefined ? { sold_price_cents } : {}),
  });

export const duplicateListing = async (sourceId: string): Promise<ListingWithPhotos> =>
  post<ListingWithPhotos>(`${BASE_URL}/${sourceId}/duplicate`);

export const incrementViewCount = async (id: string): Promise<{ success: boolean }> =>
  post<{ success: boolean }>(`${BASE_URL}/${id}/view`);

export const getListingsByIds = async (ids: string[]): Promise<ListingWithPhotos[]> =>
  get<ListingWithPhotos[]>(`${BASE_URL}/batch?ids=${ids.join(',')}`);

export const getFollowedSellerListings = async (): Promise<{ listings: ListingWithPhotos[] }> =>
  get<{ listings: ListingWithPhotos[] }>(`${BASE_URL}/followed-sellers`);

// Re-export Listing type for consumers that only need to import from this module
export type { Listing, ListingWithPhotos };
