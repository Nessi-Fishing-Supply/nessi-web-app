import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getNotificationsServer } from '@/features/notifications/services/notifications-server';

// List notifications for the authenticated user with pagination
export async function GET(request: NextRequest) {
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

    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    const result = await getNotificationsServer(user.id, limit, offset);

    return NextResponse.json(result, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Failed to list notifications:', error);
    return NextResponse.json(
      { error: 'Failed to list notifications' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
