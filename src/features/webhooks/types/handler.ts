import type Stripe from 'stripe';

export type StripeEventHandler = (event: Stripe.Event) => Promise<void>;

export type HandlerRegistry = Record<string, StripeEventHandler>;
