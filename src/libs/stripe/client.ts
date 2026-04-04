import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      appInfo: {
        name: 'nessi-web-app',
        url: process.env.NEXT_PUBLIC_APP_URL,
      },
    });
  }
  return _stripe;
}
