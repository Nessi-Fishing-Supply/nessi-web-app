import type Stripe from 'stripe';
import type { HandlerRegistry } from '@/features/webhooks/types/handler';
import { handlePaymentIntentSucceeded } from './payment-intent-succeeded';
import { handleChargeDisputeCreated } from './charge-dispute-created';

const registry: HandlerRegistry = {
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
  'charge.dispute.created': handleChargeDisputeCreated,
};

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const handler = registry[event.type];
  if (!handler) return;
  await handler(event);
}
