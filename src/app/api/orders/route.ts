import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { getOrdersByBuyerServer } from '@/features/orders/services/order-server';

// List the authenticated buyer's full order history
export async function GET() {
  try {
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

    const orders = await getOrdersByBuyerServer();

    const safeOrders = orders.map(({ stripe_payment_intent_id, ...order }) => order);

    return NextResponse.json(safeOrders, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching buyer orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
