import type { Database } from '@/types/database';
import type { ListingCategory, ListingCondition } from './listing';

// URL param-driven filter state — single source of truth
export interface SearchFilters {
  q?: string;
  category?: ListingCategory[];
  condition?: ListingCondition[];
  price_min?: number; // cents
  price_max?: number; // cents
  location_state?: string;
  free_shipping?: boolean;
  species?: string[];
  listing_type?: string[];
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'watched';
  page?: number;
  limit?: number;
}

export interface AutocompleteSuggestion {
  term: string;
  type: 'suggestion' | 'listing' | 'category';
}

export type SearchSuggestion = Database['public']['Tables']['search_suggestions']['Row'];
