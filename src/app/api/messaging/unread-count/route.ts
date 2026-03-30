import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { getUnreadCountServer } from '@/features/messaging/services/messaging-server';

// Get the total unread message count for the authenticated user
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

    const count = await getUnreadCountServer(user.id);

    return NextResponse.json({ count }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return NextResponse.json(
      { error: 'Failed to get unread count' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
