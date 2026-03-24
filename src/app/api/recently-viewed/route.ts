import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import {
  getRecentlyViewedServer,
  clearRecentlyViewedServer,
} from '@/features/recently-viewed/services/recently-viewed-server';
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

    const items = await getRecentlyViewedServer(user.id);

    return NextResponse.json(items, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching recently viewed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recently viewed' },
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

    await clearRecentlyViewedServer(user.id);

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error clearing recently viewed:', error);
    return NextResponse.json(
      { error: 'Failed to clear recently viewed' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
