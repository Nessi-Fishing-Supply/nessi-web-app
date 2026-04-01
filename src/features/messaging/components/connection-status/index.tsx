import styles from './connection-status.module.scss';

interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'hidden';
}

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  if (status === 'hidden') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${styles.banner} ${status === 'disconnected' ? styles.disconnected : styles.connected}`}
    >
      {status === 'disconnected' ? 'Connection lost. Reconnecting...' : 'Connected'}
    </div>
  );
}
