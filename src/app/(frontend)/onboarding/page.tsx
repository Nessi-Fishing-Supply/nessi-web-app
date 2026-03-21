import type { Metadata } from 'next';
import OnboardingWizard from '@/features/members/components/onboarding/onboarding-wizard';
import styles from './onboarding.module.scss';

export const metadata: Metadata = {
  title: 'Set Up Your Profile',
};

export default function OnboardingPage() {
  return (
    <main className={styles.page}>
      <OnboardingWizard />
    </main>
  );
}
