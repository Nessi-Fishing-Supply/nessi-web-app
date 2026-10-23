import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import {
  getOrderByIdServer,
  updateOrderStatusServer,
} from '@/features/orders/services/order-server';

// Mark an order as shipped with tracking info
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

    if (order.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (order.status !== 'paid') {
      return NextResponse.json(
        { error: 'Order cannot be shipped in current status' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const body = await req.json();
    const { trackingNumber, carrier } = body;

    if (!trackingNumber || typeof trackingNumber !== 'string' || !trackingNumber.trim()) {
      return NextResponse.json(
        { error: 'Tracking number is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!carrier || typeof carrier !== 'string' || !carrier.trim()) {
      return NextResponse.json(
        { error: 'Carrier is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const updated = await updateOrderStatusServer(id, {
      status: 'shipped',
      tracking_number: trackingNumber.trim(),
      carrier: carrier.trim(),
      shipped_at: new Date().toISOString(),
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    const buyerEmail = order.buyer_email;
    const buyerFirstName = order.buyer?.first_name ?? 'there';
    const listingTitle = order.listing?.title ?? 'your item';

    void (async () => {
      try {
        const { orderShipped } = await import('@/features/email/templates/order-shipped');
        const { sendEmail } = await import('@/features/email/services/send-email');
        const { subject, html } = orderShipped({
          buyerFirstName,
          listingTitle,
          trackingNumber: trackingNumber.trim(),
          carrier: carrier.trim(),
          orderId: id,
        });
        await sendEmail({ to: buyerEmail, subject, html });
      } catch (emailError) {
        console.error('Failed to send shipped email:', emailError);
      }
    })();

    const { stripe_payment_intent_id: _stripped, ...safeOrder } = updated;

    return NextResponse.json(safeOrder, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error shipping order:', error);
    return NextResponse.json(
      { error: 'Failed to ship order' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
