import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { getOrdersBySellerServer } from '@/features/orders/services/order-server';

// List the authenticated seller's orders, optionally filtered by status
export async function GET(req: Request) {
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

    const status = new URL(req.url).searchParams.get('status') ?? undefined;
    const orders = await getOrdersBySellerServer(status);

    const safeOrders = orders.map(({ stripe_payment_intent_id: _omitted, ...order }) => order);

    return NextResponse.json(safeOrders, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
