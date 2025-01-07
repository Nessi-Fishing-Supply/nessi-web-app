import React from 'react';
import styles from './Pill.module.scss';

interface PillProps {
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'default';
  children: React.ReactNode;
  className?: string;
}

const Pill: React.FC<PillProps> = ({ color = 'default', children, className }) => {
  return <div className={`${styles.pill} ${styles[color]} ${className}`}>
            <p>{children}</p>
        </div>;
};

export default Pill;
