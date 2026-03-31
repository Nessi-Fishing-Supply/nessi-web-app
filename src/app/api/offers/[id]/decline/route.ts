import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { declineOfferServer } from '@/features/messaging/services/offers-server';

// Decline a pending offer as the seller
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const offer = await declineOfferServer(user.id, id);

    return NextResponse.json(offer, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (message.includes('Only the seller')) {
      return NextResponse.json({ error: message }, { status: 403, headers: AUTH_CACHE_HEADERS });
    }

    if (message.includes('no longer pending')) {
      return NextResponse.json({ error: message }, { status: 409, headers: AUTH_CACHE_HEADERS });
    }

    console.error('Failed to decline offer:', error);
    return NextResponse.json(
      { error: 'Failed to decline offer' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
