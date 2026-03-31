import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createOfferServer } from '@/features/messaging/services/offers-server';

const BAD_REQUEST_MESSAGES = [
  'Cannot make an offer on your own listing',
  'Listing is not active',
  'Seller does not match listing',
  'at least',
  'greater than zero',
];

// Submit a new offer on a listing
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { listingId, sellerId, amountCents } = body;

    if (!listingId || !sellerId || amountCents === undefined || amountCents === null) {
      return NextResponse.json(
        { error: 'listingId, sellerId, and amountCents are required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const offer = await createOfferServer(user.id, { listingId, sellerId, amountCents });

    return NextResponse.json(offer, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const isBadRequest = BAD_REQUEST_MESSAGES.some((m) => message.includes(m));

    if (isBadRequest) {
      return NextResponse.json({ error: message }, { status: 400, headers: AUTH_CACHE_HEADERS });
    }

    console.error('Failed to create offer:', error);
    return NextResponse.json(
      { error: 'Failed to create offer' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
