import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { getStripe } from '@/libs/stripe/client';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';

// Fetch the authenticated seller's Stripe Connect available and pending balance
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

    const stripe = getStripe();
    const balance = await stripe.balance.retrieve({}, { stripeAccount: member.stripe_account_id });

    const usdAvailable = balance.available.find((b) => b.currency === 'usd');
    const usdPending = balance.pending.find((b) => b.currency === 'usd');

    return NextResponse.json(
      {
        available: usdAvailable?.amount ?? 0,
        pending: usdPending?.amount ?? 0,
      },
      { headers: AUTH_CACHE_HEADERS },
    );
  } catch (error) {
    console.error('Error fetching Stripe balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
