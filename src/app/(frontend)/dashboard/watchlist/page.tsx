import type { Metadata } from 'next';
import { Suspense } from 'react';
import WatchlistPage from './watchlist-page';

export const metadata: Metadata = { title: 'Watchlist' };

export default function Page() {
  return (
    <Suspense>
      <WatchlistPage />
    </Suspense>
  );
}
