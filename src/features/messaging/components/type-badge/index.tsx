import Pill from '@/components/indicators/pill';
import type { ThreadType } from '@/features/messaging/types/thread';
import styles from './type-badge.module.scss';

interface TypeBadgeProps {
  type: ThreadType;
  className?: string;
}

const TYPE_MAP: Record<
  ThreadType,
  { color: 'primary' | 'secondary' | 'warning' | 'default'; label: string }
> = {
  inquiry: { color: 'primary', label: 'Inquiry' },
  offer: { color: 'warning', label: 'Offer' },
  direct: { color: 'default', label: 'Direct' },
  custom_request: { color: 'secondary', label: 'Custom Request' },
};

export default function TypeBadge({ type, className }: TypeBadgeProps) {
  const { color, label } = TYPE_MAP[type];
  return (
    <Pill color={color} className={`${styles.badge}${className ? ` ${className}` : ''}`}>
      {label}
    </Pill>
  );
}
