import type Stripe from 'stripe';
import { createAdminClient } from '@/libs/supabase/admin';

export async function handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
  const pi = event.data.object as Stripe.PaymentIntent;
  const metadata = pi.metadata;

  // Validate required metadata
  if (!metadata.listing_id || !metadata.buyer_email || !metadata.seller_id) {
    console.error('payment_intent.succeeded missing required metadata:', pi.id, metadata);
    return;
  }

  let shippingAddress;
  try {
    shippingAddress = JSON.parse(metadata.shipping_address);
  } catch {
    console.error('payment_intent.succeeded: invalid shipping_address JSON:', pi.id);
    return;
  }

  const admin = createAdminClient();

  // Create order
  const { error: orderError } = await admin.from('orders').insert({
    listing_id: metadata.listing_id,
    buyer_id: metadata.buyer_id || null,
    buyer_email: metadata.buyer_email,
    seller_id: metadata.seller_id,
    stripe_payment_intent_id: pi.id,
    amount_cents: pi.amount,
    nessi_fee_cents: parseInt(metadata.nessi_fee_cents, 10),
    shipping_cost_cents: parseInt(metadata.shipping_cost_cents || '0', 10),
    shipping_address: shippingAddress,
  });

  if (orderError) {
    console.error('Failed to create order from payment_intent.succeeded:', orderError);
    return;
  }

  // Mark listing as sold
  const { error: listingError } = await admin
    .from('listings')
    .update({ status: 'sold', sold_at: new Date().toISOString() })
    .eq('id', metadata.listing_id);

  if (listingError) {
    console.error('Failed to mark listing as sold:', listingError);
  }
}
