import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUnreadCountServer } from '@/features/messaging/services/messaging-server';
import { requireShopPermission } from '@/libs/shop-permissions';
import { parseMessageContext } from '@/features/messaging/utils/parse-context';

// Get the total unread message count for the authenticated user or shop context
export async function GET(request: NextRequest) {
  try {
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

    const count = await getUnreadCountServer(user.id, context);

    return NextResponse.json({ count }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return NextResponse.json(
      { error: 'Failed to get unread count' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
