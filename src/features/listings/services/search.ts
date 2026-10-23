import { get, post } from '@/libs/fetch';
import type { SearchFilters, AutocompleteSuggestion } from '../types/search';
import type { PaginatedListings } from './listing';

const BASE_URL = '/api/listings';

function buildSearchQueryString(filters: SearchFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category?.length) params.set('category', filters.category.join(','));
  if (filters.condition?.length) params.set('condition', filters.condition.join(','));
  if (filters.price_min !== undefined) params.set('price_min', String(filters.price_min));
  if (filters.price_max !== undefined) params.set('price_max', String(filters.price_max));
  if (filters.location_state) params.set('location_state', filters.location_state);
  if (filters.free_shipping !== undefined)
    params.set('free_shipping', String(filters.free_shipping));
  if (filters.species?.length) params.set('species', filters.species.join(','));
  if (filters.listing_type?.length) params.set('listing_type', filters.listing_type.join(','));
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const str = params.toString();
  return str ? `?${str}` : '';
}

export const searchListings = async (params: SearchFilters = {}): Promise<PaginatedListings> =>
  get<PaginatedListings>(`${BASE_URL}/search${buildSearchQueryString(params)}`);

export const getAutocompleteSuggestions = async (q: string): Promise<AutocompleteSuggestion[]> =>
  get<AutocompleteSuggestion[]>(`${BASE_URL}/autocomplete?q=${encodeURIComponent(q)}`);

export const trackSearchSuggestion = async (term: string): Promise<void> => {
  try {
    await post<void>(`${BASE_URL}/search-suggestions`, { term });
  } catch {
    // Fire-and-forget — ignore failures
  }
};
