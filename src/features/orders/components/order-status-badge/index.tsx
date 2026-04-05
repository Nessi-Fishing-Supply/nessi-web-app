import Pill from '@/components/indicators/pill';
import { STATUS_LABELS, STATUS_PILL_MAP } from '@/features/orders/types/order';
import type { OrderStatus } from '@/features/orders/types/order';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export default function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <Pill color={STATUS_PILL_MAP[status] ?? 'default'} className={className}>
      {STATUS_LABELS[status] ?? status}
    </Pill>
  );
}
