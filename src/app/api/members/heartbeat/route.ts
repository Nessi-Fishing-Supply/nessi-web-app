import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

// Update the current user's last seen timestamp for online status
export async function PATCH() {
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

    const { error } = await supabase
      .from('members')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update last_seen_at:', error);
      return NextResponse.json(
        { error: 'Failed to update heartbeat' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json({ ok: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
