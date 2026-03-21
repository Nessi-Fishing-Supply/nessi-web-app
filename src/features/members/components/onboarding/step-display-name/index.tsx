'use client';

import AvatarUpload from '@/features/members/components/avatar-upload';
import { useAuth } from '@/features/auth/context';
import { formatMemberName } from '@/features/members/utils/format-name';
import useOnboardingStore from '@/features/members/stores/onboarding-store';
import Button from '@/components/controls/button';
import styles from './step-display-name.module.scss';

export default function StepAvatar() {
  const { user } = useAuth();
  const avatarUrl = useOnboardingStore.use.avatarUrl();
  const setAvatarUrl = useOnboardingStore.use.setAvatarUrl();
  const nextStep = useOnboardingStore.use.nextStep();

  const firstName = user?.user_metadata?.firstName ?? '';
  const lastName = user?.user_metadata?.lastName ?? '';
  const fullName = formatMemberName(firstName, lastName);

  return (
    <div className={styles.container}>
      <div className={styles.formBody}>
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>Add a profile photo</h2>
          <p className={styles.stepSubtitle}>Choose a photo that other anglers will see.</p>
        </div>

        <div className={styles.avatarSection}>
          <AvatarUpload
            name={fullName}
            avatarUrl={avatarUrl}
            onUpload={(url) => setAvatarUrl(url)}
          />
        </div>
      </div>

      <div className={styles.footer}>
        <Button
          type="button"
          style="primary"
          fullWidth
          onClick={nextStep}
          ariaLabel="Continue to next step"
        >
          {avatarUrl ? 'Next' : 'Skip for now'}
        </Button>
      </div>
    </div>
  );
}
