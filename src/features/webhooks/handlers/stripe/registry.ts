import type Stripe from 'stripe';
import type { HandlerRegistry } from '@/features/webhooks/types/handler';

const registry: HandlerRegistry = {
  // Future tickets will register handlers here, e.g.:
  // 'checkout.session.completed': handleCheckoutSessionCompleted,
};

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const handler = registry[event.type];
  if (!handler) return;
  await handler(event);
}
