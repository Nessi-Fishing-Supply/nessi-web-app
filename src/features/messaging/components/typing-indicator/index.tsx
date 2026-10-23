'use client';
import styles from './typing-indicator.module.scss';

interface TypingIndicatorProps {
  name: string;
}

export default function TypingIndicator({ name }: TypingIndicatorProps) {
  return (
    <div className={styles.indicator} role="status" aria-live="polite">
      <span className={styles.text}>
        {name} is typing
        <span className={styles.dots} aria-hidden="true">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
      </span>
    </div>
  );
}
