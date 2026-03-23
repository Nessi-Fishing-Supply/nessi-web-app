import React from 'react';
import styles from './member-badge.module.scss';

interface MemberBadgeProps {
  name: string;
  icon: string;
  earned: boolean;
  className?: string;
}

const MemberBadge: React.FC<MemberBadgeProps> = ({ name, icon, earned, className }) => {
  return (
    <span
      className={`${styles.root} ${earned ? styles.earned : styles.locked} ${className ?? ''}`}
      aria-label={earned ? `${name} badge earned` : `${name} badge not yet earned`}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.name}>{name}</span>
    </span>
  );
};

export default MemberBadge;
