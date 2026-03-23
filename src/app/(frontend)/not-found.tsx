import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: 'var(--spacing-800)', textAlign: 'center' }}>
      <h2>Page Not Found</h2>
      <p>The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/">Go back home</Link>
    </div>
  );
}
