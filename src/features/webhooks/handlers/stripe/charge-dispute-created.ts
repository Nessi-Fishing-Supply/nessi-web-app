import type Stripe from 'stripe';
import { createAdminClient } from '@/libs/supabase/admin';
import { sendEmail } from '@/features/email/services/send-email';
import { orderDisputed } from '@/features/email/templates/order-disputed';

export async function handleChargeDisputeCreated(event: Stripe.Event): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;
  const paymentIntentId =
    typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

  if (!paymentIntentId) {
    console.warn('charge.dispute.created: no payment_intent on dispute', dispute.id);
    return;
  }

  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, buyer_id, seller_id, buyer_email, listing:listings(title)')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (orderError || !order) {
    console.warn('charge.dispute.created: no matching order for PI', paymentIntentId);
    return;
  }

  const { error: updateError } = await admin
    .from('orders')
    .update({ status: 'disputed', escrow_status: 'disputed' })
    .eq('id', order.id);

  if (updateError) {
    console.error('charge.dispute.created: failed to update order', order.id, updateError);
    return;
  }

  const listing = Array.isArray(order.listing) ? order.listing[0] : order.listing;
  const listingTitle = listing?.title ?? 'your item';

  // Fetch seller's first name for the email
  const { data: seller } = await admin
    .from('members')
    .select('id, first_name')
    .eq('id', order.seller_id)
    .single();

  // Fetch seller email via auth admin
  const { data: sellerAuthUser } = await admin.auth.admin.getUserById(order.seller_id);

  if (sellerAuthUser?.user?.email) {
    const template = orderDisputed({
      recipientFirstName: seller?.first_name ?? 'there',
      listingTitle,
      orderId: order.id,
      role: 'seller',
    });
    sendEmail({ to: sellerAuthUser.user.email, ...template }).catch(() => {});
  }

  if (order.buyer_email) {
    let buyerFirstName = 'there';
    if (order.buyer_id) {
      const { data: buyer } = await admin
        .from('members')
        .select('first_name')
        .eq('id', order.buyer_id)
        .single();
      buyerFirstName = buyer?.first_name ?? 'there';
    }

    const template = orderDisputed({
      recipientFirstName: buyerFirstName,
      listingTitle,
      orderId: order.id,
      role: 'buyer',
    });
    sendEmail({ to: order.buyer_email, ...template }).catch(() => {});
  }
}
