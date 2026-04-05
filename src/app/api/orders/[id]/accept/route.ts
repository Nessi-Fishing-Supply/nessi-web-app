import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import {
  getOrderByIdServer,
  updateOrderStatusServer,
} from '@/features/orders/services/order-server';
import { executeStripeTransfer } from '@/features/orders/services/stripe-transfer';

// Buyer accepts delivery, releasing escrow funds to the seller
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: AUTH_CACHE_HEADERS },
      );
    }

    const order = await getOrderByIdServer(id);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (order.buyer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (order.status !== 'delivered' && order.status !== 'verification') {
      return NextResponse.json(
        { error: 'Order cannot be accepted in current status' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const sellerStripeAccountId = order.seller?.stripe_account_id;
    if (!sellerStripeAccountId) {
      return NextResponse.json(
        { error: 'Seller Stripe account not configured' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    try {
      await executeStripeTransfer({
        stripePaymentIntentId: order.stripe_payment_intent_id,
        amountCents: order.amount_cents,
        nessiFeeCents: order.nessi_fee_cents,
        sellerStripeAccountId,
      });
    } catch {
      return NextResponse.json(
        { error: 'Could not retrieve payment charge' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    const transferAmount = order.amount_cents - order.nessi_fee_cents;

    const now = new Date().toISOString();
    const updated = await updateOrderStatusServer(id, {
      status: 'released',
      escrow_status: 'released',
      buyer_accepted_at: now,
      released_at: now,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    void (async () => {
      try {
        const { createAdminClient } = await import('@/libs/supabase/admin');
        const admin = createAdminClient();
        const {
          data: { user: sellerUser },
        } = await admin.auth.admin.getUserById(order.seller_id);
        if (!sellerUser?.email) return;

        const { orderReleased } = await import('@/features/email/templates/order-released');
        const { sendEmail } = await import('@/features/email/services/send-email');
        const { subject, html } = orderReleased({
          sellerFirstName: order.seller?.first_name ?? 'there',
          listingTitle: order.listing?.title ?? 'your item',
          amountCents: transferAmount,
          orderId: id,
        });
        await sendEmail({ to: sellerUser.email, subject, html });
      } catch (emailError) {
        console.error('Failed to send order released email:', emailError);
      }
    })();

    const { stripe_payment_intent_id: _omitted, ...safeOrder } = updated;

    return NextResponse.json(safeOrder, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error accepting order:', error);
    return NextResponse.json(
      { error: 'Failed to accept order' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
