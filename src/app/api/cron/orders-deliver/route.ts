import { NextResponse } from 'next/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { getOrdersForAutoDeliverServer } from '@/features/orders/services/order-server';
import { sendEmail } from '@/features/email/services/send-email';
import { orderDelivered } from '@/features/email/templates/order-delivered';

// Auto-deliver orders shipped more than 30 days ago and notify buyers of the verification window
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const orders = await getOrdersForAutoDeliverServer(admin);
  let processed = 0;

  for (const order of orders) {
    try {
      const now = new Date();
      const verificationDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      await admin
        .from('orders')
        .update({
          status: 'delivered',
          delivered_at: now.toISOString(),
          verification_deadline: verificationDeadline.toISOString(),
        })
        .eq('id', order.id);

      try {
        const { subject, html } = orderDelivered({
          buyerFirstName: order.buyer?.first_name ?? 'there',
          listingTitle: order.listing?.title ?? 'your item',
          verificationDays: 3,
          orderId: order.id,
        });
        await sendEmail({ to: order.buyer_email, subject, html });
      } catch (emailError) {
        console.error(`Auto-deliver: failed to send email for order ${order.id}:`, emailError);
      }

      processed++;
    } catch (error) {
      console.error(`Auto-deliver: failed to process order ${order.id}:`, error);
    }
  }

  return NextResponse.json({ processed });
}
