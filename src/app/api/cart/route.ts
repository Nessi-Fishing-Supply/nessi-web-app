import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import {
  getCartServer,
  addToCartServer,
  clearCartServer,
} from '@/features/cart/services/cart-server';
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

    const cart = await getCartServer(user.id);

    return NextResponse.json(cart, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

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

    const { listingId, addedFrom } = await req.json();

    const item = await addToCartServer(user.id, listingId, 0, addedFrom);

    return NextResponse.json(item, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Listing not found or no longer active') {
        return NextResponse.json(
          { error: error.message },
          { status: 404, headers: AUTH_CACHE_HEADERS },
        );
      }
      if (error.message === 'Item already in cart') {
        return NextResponse.json(
          { error: error.message },
          { status: 409, headers: AUTH_CACHE_HEADERS },
        );
      }
      if (error.message === 'Cannot add your own listing to cart') {
        return NextResponse.json(
          { error: error.message },
          { status: 403, headers: AUTH_CACHE_HEADERS },
        );
      }
      if (error.message === 'Cart is full (maximum 25 items)') {
        return NextResponse.json(
          { error: error.message },
          { status: 422, headers: AUTH_CACHE_HEADERS },
        );
      }
    }
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: 'Failed to add item to cart' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

export async function DELETE() {
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

    await clearCartServer(user.id);

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json(
      { error: 'Failed to clear cart' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
