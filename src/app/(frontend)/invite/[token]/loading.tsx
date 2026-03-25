import React from 'react';

export default function InviteLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 'var(--spacing-700) var(--spacing-page-sm)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--spacing-600)',
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-500)',
          boxShadow: 'var(--shadow-300)',
          border: '1px solid var(--color-neutral-200)',
          padding: 'var(--spacing-700) var(--spacing-600)',
        }}
      >
        {/* Avatar circle placeholder */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: 'var(--radius-circle)',
            background: 'var(--color-neutral-200)',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />

        {/* Text line placeholders */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--spacing-300)',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '60%',
              height: '24px',
              borderRadius: 'var(--radius-200)',
              background: 'var(--color-neutral-200)',
            }}
            aria-hidden="true"
          />
          <div
            style={{
              width: '80%',
              height: '18px',
              borderRadius: 'var(--radius-200)',
              background: 'var(--color-neutral-200)',
            }}
            aria-hidden="true"
          />
          <div
            style={{
              width: '40%',
              height: '16px',
              borderRadius: 'var(--radius-200)',
              background: 'var(--color-neutral-200)',
            }}
            aria-hidden="true"
          />
        </div>

        {/* Button placeholder */}
        <div
          style={{
            width: '100%',
            height: '44px',
            borderRadius: 'var(--radius-300)',
            background: 'var(--color-neutral-200)',
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
