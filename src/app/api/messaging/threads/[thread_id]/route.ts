import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getThreadByIdServer } from '@/features/messaging/services/messaging-server';
import { requireShopPermission } from '@/libs/shop-permissions';
import { parseMessageContext } from '@/features/messaging/utils/parse-context';

// Get thread details including participants and context
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ thread_id: string }> },
) {
  try {
    const { thread_id } = await params;

    const context = parseMessageContext(request);

    if (context.type === 'shop') {
      const result = await requireShopPermission(request, 'messaging', 'view');
      if (result instanceof NextResponse) return result;
    }

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

    const thread = await getThreadByIdServer(user.id, thread_id, context);

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json(thread, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Failed to get thread:', error);
    return NextResponse.json(
      { error: 'Failed to get thread' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
