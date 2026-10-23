import { NextResponse } from 'next/server';
import { getFollowerCountServer } from '@/features/follows/services/follow-server';
import type { FollowTargetType } from '@/features/follows/types/follow';

// Get the follower count for a member or shop
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const target_type = searchParams.get('target_type');
    const target_id = searchParams.get('target_id');

    if (!target_type || !target_id) {
      return NextResponse.json(
        { error: 'Missing required params: target_type, target_id' },
        { status: 400 },
      );
    }

    if (target_type !== 'member' && target_type !== 'shop') {
      return NextResponse.json(
        { error: 'Invalid target_type: must be "member" or "shop"' },
        { status: 400 },
      );
    }

    const { count } = await getFollowerCountServer(target_type as FollowTargetType, target_id);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching follower count:', error);
    return NextResponse.json({ error: 'Failed to fetch follower count' }, { status: 500 });
  }
}
