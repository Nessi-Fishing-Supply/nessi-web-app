import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

// Enables or disables seller mode on the member's account.
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

    const body = await req.json();
    const { is_seller } = body;

    if (typeof is_seller !== 'boolean') {
      return NextResponse.json(
        { error: 'is_seller must be a boolean' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    // When disabling seller mode, archive all member-owned active listings
    if (!is_seller) {
      const { error: listingsError } = await supabase
        .from('listings')
        .update({ status: 'archived' as const })
        .eq('seller_id', user.id)
        .is('shop_id', null)
        .eq('status', 'active')
        .is('deleted_at', null);

      if (listingsError) {
        return NextResponse.json(
          { error: listingsError.message },
          { status: 500, headers: AUTH_CACHE_HEADERS },
        );
      }
    }

    // Update the member's is_seller flag
    const { data: updated, error: memberError } = await supabase
      .from('members')
      .update({ is_seller })
      .eq('id', user.id)
      .select()
      .single();

    if (memberError) {
      return NextResponse.json(
        { error: memberError.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json(updated, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Toggle seller error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle seller status' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
