import type { Member } from '@/features/members/types/member';
import styles from './member-completeness.module.scss';

interface MemberCompletenessProps {
  member: Member;
}

function computeCompleteness(member: Member): number {
  let score = 0;
  if (member.avatar_url) score += 20;
  if (member.bio) score += 20;
  if (member.primary_species && member.primary_species.length > 0) score += 20;
  if (member.primary_technique && member.primary_technique.length > 0) score += 20;
  if (member.home_state) score += 20;
  return score;
}

export default function MemberCompleteness({ member }: MemberCompletenessProps) {
  const percentage = computeCompleteness(member);

  if (percentage === 100) return null;

  const milestones = [20, 40, 60, 80, 100];

  return (
    <div className={styles.container}>
      <div className={styles.labelRow}>
        <span className={styles.label}>Profile completeness</span>
        <span className={styles.percentage}>{percentage}%</span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Member completeness"
      >
        <div className={styles.fill} style={{ width: `${percentage}%` }} />
      </div>
      <div className={styles.milestones} aria-hidden="true">
        {milestones.map((m) => (
          <span
            key={m}
            className={`${styles.milestone} ${percentage >= m ? styles.milestoneReached : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
