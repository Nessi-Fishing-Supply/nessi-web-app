'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HiX, HiArrowRight } from 'react-icons/hi';
import { useAuth } from '@/features/auth/context';
import { useMember } from '@/features/members/hooks/use-member';
import styles from './onboarding-banner.module.scss';

export default function OnboardingBanner() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: member, isLoading: memberLoading } = useMember(user?.id ?? '', !!user);
  const [isDismissed, setIsDismissed] = useState(false);
  const pathname = usePathname();

  // Don't show on the onboarding page itself
  if (pathname === '/onboarding') return null;

  // Don't show while loading, if not authenticated, or if dismissed
  if (authLoading || memberLoading || !isAuthenticated || isDismissed) return null;

  // Don't show if onboarding is already complete
  if (member?.onboarding_completed_at) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <p className={styles.text}>
        Your profile is incomplete.{' '}
        <Link href="/onboarding" className={styles.link}>
          Complete your profile <HiArrowRight aria-hidden="true" />
        </Link>
      </p>
      <button
        type="button"
        className={styles.close}
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss profile completion reminder"
      >
        <HiX aria-hidden="true" />
      </button>
    </div>
  );
}
