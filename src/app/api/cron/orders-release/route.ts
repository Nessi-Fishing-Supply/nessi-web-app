import { NextResponse } from 'next/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { getOrdersForAutoReleaseServer } from '@/features/orders/services/order-server';
import { executeStripeTransfer } from '@/features/orders/services/stripe-transfer';
import { sendEmail } from '@/features/email/services/send-email';
import { orderReleased } from '@/features/email/templates/order-released';

// Auto-release escrow funds for orders past the 3-day buyer verification window
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const orders = await getOrdersForAutoReleaseServer(admin);
  let processed = 0;

  for (const order of orders) {
    try {
      const sellerStripeAccountId = order.seller?.stripe_account_id;
      if (!sellerStripeAccountId) {
        console.error(
          `Auto-release: seller ${order.seller_id} has no Stripe account, order ${order.id}`,
        );
        continue;
      }

      await executeStripeTransfer({
        stripePaymentIntentId: order.stripe_payment_intent_id,
        amountCents: order.amount_cents,
        nessiFeeCents: order.nessi_fee_cents,
        sellerStripeAccountId,
      });

      const transferAmount = order.amount_cents - order.nessi_fee_cents;

      const now = new Date().toISOString();
      await admin
        .from('orders')
        .update({
          status: 'released',
          escrow_status: 'released',
          released_at: now,
        })
        .eq('id', order.id);

      try {
        const {
          data: { user: sellerUser },
        } = await admin.auth.admin.getUserById(order.seller_id);
        if (sellerUser?.email) {
          const { subject, html } = orderReleased({
            sellerFirstName: order.seller?.first_name ?? 'there',
            listingTitle: order.listing?.title ?? 'your item',
            amountCents: transferAmount,
            orderId: order.id,
          });
          await sendEmail({ to: sellerUser.email, subject, html });
        }
      } catch (emailError) {
        console.error(`Auto-release: failed to send email for order ${order.id}:`, emailError);
      }

      processed++;
    } catch (error) {
      console.error(`Auto-release: failed to process order ${order.id}:`, error);
    }
  }

  return NextResponse.json({ processed });
}
