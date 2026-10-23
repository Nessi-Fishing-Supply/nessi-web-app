import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getOfferByIdServer } from '@/features/messaging/services/offers-server';

// Get offer details including listing and participant info
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const offer = await getOfferByIdServer(user.id, id);

    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json(offer, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Failed to get offer:', error);
    return NextResponse.json(
      { error: 'Failed to get offer' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
