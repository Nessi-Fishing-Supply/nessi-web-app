import styles from './loading.module.scss';

export default function InviteLoading() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Avatar circle placeholder */}
        <div className={styles.avatarPlaceholder} aria-hidden="true" />

        {/* Text line placeholders */}
        <div className={styles.textGroup}>
          <div className={styles.textLineLg} aria-hidden="true" />
          <div className={styles.textLineMd} aria-hidden="true" />
          <div className={styles.textLineSm} aria-hidden="true" />
        </div>

        {/* Button placeholder */}
        <div className={styles.buttonPlaceholder} aria-hidden="true" />
      </div>
    </div>
  );
}
