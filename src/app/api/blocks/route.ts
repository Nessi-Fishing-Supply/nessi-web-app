import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import {
  getBlockedMembersServer,
  unblockMemberServer,
} from '@/features/blocks/services/block-server';
import { NextResponse } from 'next/server';

// List all members blocked by the authenticated user
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

    const blockedMembers = await getBlockedMembersServer(user.id);

    return NextResponse.json(blockedMembers, { status: 200, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching blocked members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blocked members' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Unblock a member by removing the block record
export async function DELETE(req: Request) {
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
    const blocked_id = searchParams.get('blocked_id');

    if (!blocked_id || blocked_id.trim() === '') {
      return NextResponse.json(
        { error: 'blocked_id is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const result = await unblockMemberServer(user.id, blocked_id);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json({ success: true }, { status: 200, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error unblocking member:', error);
    return NextResponse.json(
      { error: 'Failed to unblock member' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
