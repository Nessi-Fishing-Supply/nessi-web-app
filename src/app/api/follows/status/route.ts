import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { getFollowStatusServer } from '@/features/follows/services/follow-server';
import type { FollowTargetType } from '@/features/follows/types/follow';
import { NextResponse } from 'next/server';

// Check if the authenticated user follows a member or shop
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
    const target_type = searchParams.get('target_type');
    const target_id = searchParams.get('target_id');

    if (!target_type || !target_id) {
      return NextResponse.json(
        { error: 'target_type and target_id are required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const validTargetTypes: FollowTargetType[] = ['member', 'shop'];
    if (!validTargetTypes.includes(target_type as FollowTargetType)) {
      return NextResponse.json(
        { error: 'Invalid target_type' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const status = await getFollowStatusServer(user.id, target_type as FollowTargetType, target_id);

    return NextResponse.json(status, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error checking follow status:', error);
    return NextResponse.json(
      { error: 'Failed to check follow status' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
