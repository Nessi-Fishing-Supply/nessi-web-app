import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { mergeGuestCartServer } from '@/features/cart/services/cart-server';

// Merges items browsed as a guest into the user's cart after sign-in.
export async function POST(req: Request) {
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

    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and must not be empty' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const merged = await mergeGuestCartServer(user.id, items);
    return NextResponse.json({ merged }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error merging guest cart:', error);
    return NextResponse.json(
      { error: 'Failed to merge guest cart' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
