import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { removeFromCartServer } from '@/features/cart/services/cart-server';

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
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

    await removeFromCartServer(user.id, id);

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === 'Cart item not found') {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }
    console.error('Error removing cart item:', error);
    return NextResponse.json(
      { error: 'Failed to remove cart item' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
