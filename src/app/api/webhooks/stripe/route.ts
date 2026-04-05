import { NextResponse } from 'next/server';

import { handleStripeEvent } from '@/features/webhooks/handlers/stripe/registry';
import {
  insertWebhookEvent,
  isEventAlreadyProcessed,
  markEventFailed,
  markEventProcessed,
} from '@/features/webhooks/services/event-logger';
import { getStripe } from '@/libs/stripe/client';

// Receive and process incoming Stripe webhook events
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const isDuplicate = await isEventAlreadyProcessed(event.id);
  if (isDuplicate) {
    return NextResponse.json({ received: true });
  }

  await insertWebhookEvent(event.id, event.type, 'stripe', event);

  try {
    await handleStripeEvent(event);
    await markEventProcessed(event.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Stripe webhook handler failed:', error);
    await markEventFailed(event.id, message);
  }

  return NextResponse.json({ received: true });
}
