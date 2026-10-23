import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

// Checks whether the member has any active listings that would block disabling seller mode.
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

    const { count, error } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .is('shop_id', null)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    const activeListingsCount = count ?? 0;
    // TODO: Check active orders count when orders system exists
    const activeOrdersCount = 0;
    const canDisable = activeListingsCount === 0 && activeOrdersCount === 0;

    return NextResponse.json(
      {
        canDisable,
        activeListingsCount,
        activeOrdersCount,
      },
      { headers: AUTH_CACHE_HEADERS },
    );
  } catch (error) {
    console.error('Seller preconditions error:', error);
    return NextResponse.json(
      { error: 'Failed to check seller preconditions' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
