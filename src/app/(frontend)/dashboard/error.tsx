'use client';

import React from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 'var(--spacing-800)', textAlign: 'center' }}>
      <h2>Something went wrong</h2>
      <p>{error.message || 'An unexpected error occurred.'}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
