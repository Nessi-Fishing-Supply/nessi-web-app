import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { getFollowingServer } from '@/features/follows/services/follow-server';
import type { FollowTargetType } from '@/features/follows/types/follow';

// List members and shops the authenticated user follows
export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const targetTypeParam = searchParams.get('target_type');

    if (targetTypeParam !== null && targetTypeParam !== 'member' && targetTypeParam !== 'shop') {
      return NextResponse.json(
        { error: 'Invalid target_type. Must be "member" or "shop".' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const targetType = targetTypeParam as FollowTargetType | null;
    const following = await getFollowingServer(user.id, targetType || undefined);

    return NextResponse.json(following, { status: 200, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching following:', error);
    return NextResponse.json(
      { error: 'Failed to fetch following' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
