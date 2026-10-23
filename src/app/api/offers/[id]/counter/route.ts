import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { counterOfferServer } from '@/features/messaging/services/offers-server';

// Counter a pending offer with a new amount
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await request.json();
    const { amountCents } = body;

    if (amountCents === undefined || amountCents === null) {
      return NextResponse.json(
        { error: 'amountCents is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const offer = await counterOfferServer(user.id, id, { amountCents });

    // Fire-and-forget email notification to original offerer
    void (async () => {
      try {
        const { getOfferEmailContext, sendNotificationEmail } =
          await import('@/features/messaging/utils/notification-email');
        const { offerNotification } = await import('@/features/email/templates/offer-notification');

        const { senderName, listingTitle } = await getOfferEmailContext({
          senderId: user.id,
          listingId: offer.listing_id,
          supabase,
        });

        const { subject, html } = offerNotification({
          type: 'countered',
          listingTitle,
          amount: offer.amount_cents,
          senderName,
          threadId: offer.thread_id,
        });

        // offer.seller_id is the original buyer (roles swapped in counter)
        await sendNotificationEmail({ recipientId: offer.seller_id, subject, html });
      } catch (err) {
        console.error('[offer-counter-email] failed:', err);
      }
    })();

    return NextResponse.json(offer, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (message.includes('Only the seller')) {
      return NextResponse.json({ error: message }, { status: 403, headers: AUTH_CACHE_HEADERS });
    }

    if (message.includes('no longer pending')) {
      return NextResponse.json({ error: message }, { status: 409, headers: AUTH_CACHE_HEADERS });
    }

    if (message.includes('at least') || message.includes('greater than zero')) {
      return NextResponse.json({ error: message }, { status: 400, headers: AUTH_CACHE_HEADERS });
    }

    console.error('Failed to counter offer:', error);
    return NextResponse.json(
      { error: 'Failed to counter offer' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
