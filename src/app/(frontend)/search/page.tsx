import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import SearchResults from './search-results';

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';

  const filterKeys = [
    'category',
    'condition',
    'price_min',
    'price_max',
    'location_state',
    'free_shipping',
    'species',
    'listing_type',
  ];
  const hasFilters = filterKeys.some((key) => params[key] !== undefined);

  return {
    title: q ? `Search results for "${q}"` : 'Search Fishing Gear',
    description: q ? `Find ${q} fishing gear on Nessi` : 'Search for fishing gear on Nessi',
    ...(hasFilters && { robots: { index: false, follow: true } }),
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';

  if (!q || q.length < 2) {
    redirect('/');
  }

  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
