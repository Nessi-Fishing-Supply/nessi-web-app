import type Stripe from 'stripe';
import type { HandlerRegistry } from '@/features/webhooks/types/handler';
import { handlePaymentIntentSucceeded } from './payment-intent-succeeded';

const registry: HandlerRegistry = {
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
};

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const handler = registry[event.type];
  if (!handler) return;
  await handler(event);
}
