import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { getOrderByIdServer } from '@/features/orders/services/order-server';

// View a single order as the buyer or seller
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { stripe_payment_intent_id: _stripped, ...safeOrder } = order;

    return NextResponse.json(safeOrder, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
