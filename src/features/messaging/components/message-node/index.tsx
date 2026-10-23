import InlineBanner from '@/components/indicators/inline-banner';
import type { MessageWithSender } from '@/features/messaging/types/message';
import styles from './message-node.module.scss';

interface MessageNodeProps {
  message: MessageWithSender;
}

export default function MessageNode({ message }: MessageNodeProps) {
  if (message.type === 'system') {
    return (
      <p className={styles.system} aria-label={`System message: ${message.content}`}>
        {message.content}
      </p>
    );
  }

  if (message.type === 'nudge') {
    return (
      <div className={styles.nudge}>
        <InlineBanner variant="info" title={message.content ?? ''} />
      </div>
    );
  }

  return null;
}
