'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { SearchFilters } from '../types/search';
import type { ListingCategory, ListingCondition } from '../types/listing';

const ARRAY_PARAMS = new Set(['category', 'condition', 'species', 'listing_type']);

function parseFilters(params: URLSearchParams): SearchFilters {
  const filters: SearchFilters = {};

  const q = params.get('q');
  if (q) filters.q = q;

  const category = params.get('category');
  if (category) filters.category = category.split(',') as ListingCategory[];

  const condition = params.get('condition');
  if (condition) filters.condition = condition.split(',') as ListingCondition[];

  const priceMin = params.get('price_min');
  if (priceMin) filters.price_min = Number(priceMin);

  const priceMax = params.get('price_max');
  if (priceMax) filters.price_max = Number(priceMax);

  const locationState = params.get('location_state');
  if (locationState) filters.location_state = locationState;

  const freeShipping = params.get('free_shipping');
  if (freeShipping === 'true') filters.free_shipping = true;

  const species = params.get('species');
  if (species) filters.species = species.split(',');

  const listingType = params.get('listing_type');
  if (listingType) filters.listing_type = listingType.split(',');

  const sort = params.get('sort');
  if (sort) filters.sort = sort as SearchFilters['sort'];

  const page = params.get('page');
  if (page) filters.page = Number(page);

  const limit = params.get('limit');
  if (limit) filters.limit = Number(limit);

  return filters;
}

function countActiveFilters(params: URLSearchParams): number {
  let count = 0;

  for (const [key, value] of params.entries()) {
    if (key === 'q' || key === 'page' || key === 'limit' || key === 'sort') continue;
    if (ARRAY_PARAMS.has(key)) {
      count += value.split(',').filter(Boolean).length;
    } else {
      count += 1;
    }
  }

  return count;
}

export function useSearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = parseFilters(searchParams);

  const setFilter = (key: string, value: string | string[] | number | boolean | undefined) => {
    const next = new URLSearchParams(searchParams.toString());

    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      next.delete(key);
    } else if (Array.isArray(value)) {
      next.set(key, value.join(','));
    } else if (typeof value === 'boolean') {
      if (value) {
        next.set(key, 'true');
      } else {
        next.delete(key);
      }
    } else {
      next.set(key, String(value));
    }

    next.delete('page');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const removeFilter = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams.toString());

    if (value !== undefined && ARRAY_PARAMS.has(key)) {
      const existing = next.get(key);
      if (existing) {
        const updated = existing
          .split(',')
          .filter((v) => v !== value)
          .filter(Boolean);
        if (updated.length === 0) {
          next.delete(key);
        } else {
          next.set(key, updated.join(','));
        }
      }
    } else {
      next.delete(key);
    }

    next.delete('page');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    const q = searchParams.get('q');
    if (q) next.set('q', q);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const hasActiveFilters = (() => {
    for (const key of searchParams.keys()) {
      if (key !== 'q' && key !== 'page' && key !== 'limit' && key !== 'sort') return true;
    }
    return false;
  })();

  const activeFilterCount = countActiveFilters(searchParams);

  return {
    filters,
    setFilter,
    removeFilter,
    clearAllFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}
