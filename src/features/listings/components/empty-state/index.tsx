import AppLink from '@/components/controls/app-link';

import styles from './empty-state.module.scss';

interface EmptyStateProps {
  message: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function EmptyState({ message, description, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.message}>{message}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {ctaLabel && ctaHref && (
        <AppLink href={ctaHref} style="primary">
          {ctaLabel}
        </AppLink>
      )}
    </div>
  );
}
