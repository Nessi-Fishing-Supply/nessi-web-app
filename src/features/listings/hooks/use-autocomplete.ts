import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from './use-debounced-value';
import { getAutocompleteSuggestions } from '../services/search';
import type { AutocompleteSuggestion } from '../types/search';

export function useAutocomplete(query: string) {
  const debouncedQuery = useDebouncedValue(query, 200);

  return useQuery<AutocompleteSuggestion[]>({
    queryKey: ['autocomplete', debouncedQuery],
    queryFn: () => getAutocompleteSuggestions(debouncedQuery),
    enabled: debouncedQuery.length >= 3,
    staleTime: 30 * 1000,
  });
}
