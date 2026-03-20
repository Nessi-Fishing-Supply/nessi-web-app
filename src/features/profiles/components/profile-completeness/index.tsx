import type { Profile } from '@/features/profiles/types/profile';
import styles from './profile-completeness.module.scss';

interface ProfileCompletenessProps {
  profile: Profile;
}

function computeCompleteness(profile: Profile): number {
  let score = 0;
  if (profile.avatar_url) score += 20;
  if (profile.bio) score += 20;
  if (profile.primary_species && profile.primary_species.length > 0) score += 20;
  if (profile.primary_technique && profile.primary_technique.length > 0) score += 20;
  if (profile.home_state) score += 20;
  return score;
}

export default function ProfileCompleteness({ profile }: ProfileCompletenessProps) {
  const percentage = computeCompleteness(profile);

  if (percentage === 100) return null;

  return (
    <div className={styles.container}>
      <span className={styles.label}>{percentage}% complete</span>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
      >
        <div className={styles.fill} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
