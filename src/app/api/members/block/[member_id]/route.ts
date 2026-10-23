import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { unblockMemberServer } from '@/features/messaging/services/blocks-server';

// Unblock a member to allow them to message you again
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ member_id: string }> },
) {
  try {
    const { member_id } = await params;
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

    const result = await unblockMemberServer(user.id, member_id);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json({ success: true }, { status: 200, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Failed to unblock member:', error);
    return NextResponse.json(
      { error: 'Failed to unblock member' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
