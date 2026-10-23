import { getStripe } from '@/libs/stripe/client';
import type Stripe from 'stripe';

interface TransferParams {
  stripePaymentIntentId: string;
  amountCents: number;
  nessiFeeCents: number;
  sellerStripeAccountId: string;
}

export async function executeStripeTransfer({
  stripePaymentIntentId,
  amountCents,
  nessiFeeCents,
  sellerStripeAccountId,
}: TransferParams): Promise<Stripe.Transfer> {
  const stripe = getStripe();

  const pi = await stripe.paymentIntents.retrieve(stripePaymentIntentId, {
    expand: ['latest_charge'],
  });

  const charge = pi.latest_charge as Stripe.Charge;
  if (!charge?.id) {
    throw new Error('Could not retrieve payment charge');
  }

  const transferAmount = amountCents - nessiFeeCents;

  return stripe.transfers.create({
    amount: transferAmount,
    currency: 'usd',
    destination: sellerStripeAccountId,
    source_transaction: charge.id,
  });
}
