import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { refreshExpiryServer } from '@/features/cart/services/cart-server';

// Extends the hold timer on a cart item to keep it reserved longer.
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

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

    const updated = await refreshExpiryServer(user.id, id);
    return NextResponse.json(updated, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === 'Cart item not found') {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }
    console.error('Error refreshing cart item expiry:', error);
    return NextResponse.json(
      { error: 'Failed to refresh cart item expiry' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
