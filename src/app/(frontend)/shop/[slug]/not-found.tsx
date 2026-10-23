import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: 'var(--spacing-1000) var(--spacing-300)',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 'var(--font-size-1100)', marginBottom: 'var(--spacing-300)' }}>
        Shop Not Found
      </h1>
      <p
        style={{
          color: 'var(--color-neutral-600)',
          fontSize: 'var(--font-size-700)',
          marginBottom: 'var(--spacing-600)',
        }}
      >
        The shop you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <Link
        href="/"
        style={{
          color: 'var(--color-primary-600)',
          fontSize: 'var(--font-size-700)',
          textDecoration: 'none',
        }}
      >
        Back to home
      </Link>
    </div>
  );
}
