import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { blockMemberServer } from '@/features/messaging/services/blocks-server';

// Block a member to prevent them from messaging you
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (memberId === user.id) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const block = await blockMemberServer(user.id, memberId);

    return NextResponse.json(block, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (message === 'Already blocked') {
      return NextResponse.json({ error: message }, { status: 409, headers: AUTH_CACHE_HEADERS });
    }

    console.error('Failed to block member:', error);
    return NextResponse.json(
      { error: 'Failed to block member' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
