import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { getCartCountServer } from '@/features/cart/services/cart-server';
import { NextResponse } from 'next/server';

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

    const count = await getCartCountServer(user.id);

    return NextResponse.json({ count }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching cart count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart count' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
