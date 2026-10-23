import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { validateCartServer } from '@/features/cart/services/cart-server';

// Checks that all cart items are still available and valid before checkout.
export async function POST() {
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

    const result = await validateCartServer(user.id);
    return NextResponse.json(result, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error validating cart:', error);
    return NextResponse.json(
      { error: 'Failed to validate cart' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
