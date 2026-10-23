import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { getStripe } from '@/libs/stripe/client';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';

// Fetch paginated transfer history for the authenticated seller's Stripe Connect account
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

    const { data: member } = await supabase
      .from('members')
      .select('stripe_account_id, is_stripe_connected')
      .eq('id', user.id)
      .single();

    if (!member?.stripe_account_id || !member?.is_stripe_connected) {
      return NextResponse.json(
        { error: 'Stripe account not connected' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const startingAfter = url.searchParams.get('starting_after') ?? undefined;

    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 20;
    const limit = Math.min(Math.max(Number.isNaN(parsedLimit) ? 20 : parsedLimit, 1), 100);

    const stripe = getStripe();
    const transfers = await stripe.transfers.list({
      destination: member.stripe_account_id,
      limit,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    const items = transfers.data.map((transfer) => {
      const nessiFeeCents = parseInt(transfer.metadata?.nessi_fee_cents || '0', 10);
      const netAmount = transfer.amount;
      return {
        id: transfer.id,
        amount: netAmount + nessiFeeCents,
        nessiFeeCents,
        netAmount,
        createdAt: new Date(transfer.created * 1000).toISOString(),
        orderId: transfer.metadata?.order_id || null,
      };
    });

    const nextCursor =
      transfers.has_more && transfers.data.length > 0
        ? transfers.data[transfers.data.length - 1].id
        : null;

    return NextResponse.json(
      {
        transfers: items,
        hasMore: transfers.has_more,
        nextCursor,
      },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch (error) {
    console.error('Error fetching Stripe transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
