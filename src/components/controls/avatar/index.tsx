'use client';

import Image from 'next/image';
import styles from './avatar.module.scss';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface AvatarProps {
  size?: AvatarSize;
  name: string;
  imageUrl?: string;
  isShop?: boolean;
  colorSeed?: string;
  isOnline?: boolean;
}

const SIZE_PX: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
};

const GRADIENTS = [
  'linear-gradient(135deg, var(--color-primary-400) 0%, var(--color-primary-600) 100%)',
  'linear-gradient(135deg, var(--color-accent-400) 0%, var(--color-accent-600) 100%)',
  'linear-gradient(135deg, var(--color-destructive-400) 0%, var(--color-destructive-600) 100%)',
  'linear-gradient(135deg, var(--color-primary-300) 0%, var(--color-accent-500) 100%)',
  'linear-gradient(135deg, var(--color-accent-500) 0%, var(--color-destructive-500) 100%)',
  'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-destructive-400) 100%)',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(seed: string): string {
  return GRADIENTS[hashString(seed) % GRADIENTS.length];
}

export default function Avatar({
  size = 'md',
  name,
  imageUrl,
  isShop = false,
  colorSeed,
  isOnline,
}: AvatarProps) {
  const px = SIZE_PX[size];
  const initials = getInitials(name);
  const gradient = getGradient(colorSeed ?? name);

  return (
    <span
      className={`${styles.avatar} ${styles[size]} ${isShop ? styles.shop : ''}`}
      style={{ width: px, height: px, minWidth: px }}
      role="img"
      aria-label={name}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes={`${px}px`}
          style={{ objectFit: 'cover' }}
          className={styles.image}
        />
      ) : (
        <span className={styles.initials} style={{ background: gradient }} aria-hidden="true">
          {initials}
        </span>
      )}
      {isOnline && <span className={styles.onlineDot} aria-label="Online" role="status" />}
    </span>
  );
}
