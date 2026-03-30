import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { archiveThreadServer } from '@/features/messaging/services/messaging-server';

// Archive a message thread
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ thread_id: string }> },
) {
  try {
    const { thread_id } = await params;
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

    await archiveThreadServer(user.id, thread_id);

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to archive thread';

    if (message === 'Not a participant in this thread') {
      return NextResponse.json(
        { error: 'You are not a participant in this thread' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    console.error('Failed to archive thread:', error);
    return NextResponse.json(
      { error: 'Failed to archive thread' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
