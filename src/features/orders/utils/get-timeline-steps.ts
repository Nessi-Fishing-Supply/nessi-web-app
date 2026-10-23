import type { TimelineStep } from '@/features/orders/components/order-timeline';
import type { OrderWithListing, OrderStatus } from '@/features/orders/types/order';
import { TIMELINE_STEPS } from '@/features/orders/types/order';

const STATUS_TO_STEP_INDEX: Record<string, number> = {
  paid: 0,
  shipped: 1,
  delivered: 2,
  verification: 3,
  released: 4,
  disputed: 2,
  refunded: 0,
};

export function getTimelineSteps(order: OrderWithListing): {
  steps: TimelineStep[];
  currentStep: number;
} {
  const steps: TimelineStep[] = TIMELINE_STEPS.map((stepDef) => ({
    label: stepDef.label,
    description: stepDef.getDescription(order),
    timestamp: getTimestampForStep(stepDef.key, order),
  }));

  const currentStep = STATUS_TO_STEP_INDEX[order.status] ?? 0;

  return { steps, currentStep };
}

function getTimestampForStep(key: OrderStatus, order: OrderWithListing): Date | undefined {
  switch (key) {
    case 'paid':
      return order.created_at ? new Date(order.created_at) : undefined;
    case 'shipped':
      return order.shipped_at ? new Date(order.shipped_at) : undefined;
    case 'delivered':
      return order.delivered_at ? new Date(order.delivered_at) : undefined;
    case 'verification':
      return order.delivered_at ? new Date(order.delivered_at) : undefined;
    case 'released':
      return order.released_at ? new Date(order.released_at) : undefined;
    default:
      return undefined;
  }
}
