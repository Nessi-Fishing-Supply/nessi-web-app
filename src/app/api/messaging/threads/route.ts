import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { ThreadType } from '@/features/messaging/types/thread';
import {
  getThreadsServer,
  createThreadServer,
} from '@/features/messaging/services/messaging-server';
import { requireShopPermission } from '@/libs/shop-permissions';
import { parseMessageContext } from '@/features/messaging/utils/parse-context';

const VALID_THREAD_TYPES: ThreadType[] = ['inquiry', 'direct', 'offer', 'custom_request'];

// List the authenticated user's message threads with optional type filter
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

    const type = request.nextUrl.searchParams.get('type') as ThreadType | null;

    if (type && !VALID_THREAD_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid thread type. Must be one of: ${VALID_THREAD_TYPES.join(', ')}` },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const threads = await getThreadsServer(user.id, type ?? undefined, context);

    return NextResponse.json(threads, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Failed to get threads:', error);
    return NextResponse.json(
      { error: 'Failed to get threads' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Create a new message thread between two members
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
    const { type, participantIds, roles, listingId, shopId } = body;

    if (!type || !VALID_THREAD_TYPES.includes(type)) {
      return NextResponse.json(
        {
          error: `Invalid or missing thread type. Must be one of: ${VALID_THREAD_TYPES.join(', ')}`,
        },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 2) {
      return NextResponse.json(
        { error: 'participantIds must be an array with at least 2 members' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!roles || !Array.isArray(roles) || roles.length !== participantIds.length) {
      return NextResponse.json(
        { error: 'roles must be an array matching participantIds length' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (type === 'inquiry' && !listingId) {
      return NextResponse.json(
        { error: 'listingId is required for inquiry threads' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (type === 'custom_request' && !shopId) {
      return NextResponse.json(
        { error: 'shopId is required for custom request threads' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!participantIds.includes(user.id)) {
      return NextResponse.json(
        { error: 'You must be a participant in the thread' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Block check: prevent thread creation when a block exists in either direction
    const otherParticipantId = participantIds.find((id: string) => id !== user.id);
    if (otherParticipantId) {
      const { data: blockRow, error: blockError } = await supabase
        .from('member_blocks')
        .select('id')
        .or(
          `and(blocker_id.eq.${user.id},blocked_id.eq.${otherParticipantId}),and(blocker_id.eq.${otherParticipantId},blocked_id.eq.${user.id})`,
        )
        .maybeSingle();

      if (blockError) {
        throw new Error(`Failed to check blocks: ${blockError.message}`);
      }

      if (blockRow) {
        return NextResponse.json(
          { error: 'You cannot message this user' },
          { status: 403, headers: AUTH_CACHE_HEADERS },
        );
      }
    }

    // Determine context for each participant
    let contextTypes: ('member' | 'shop')[] | undefined;
    let contextIds: string[] | undefined;

    if (body.listingId) {
      const { data: listing } = await supabase
        .from('listings')
        .select('seller_id, shop_id')
        .eq('id', body.listingId)
        .single();

      if (listing?.shop_id) {
        // Seller participates as shop identity
        contextTypes = ['member', 'shop'];
        contextIds = [user.id, listing.shop_id];
      }
    }

    const { thread, existing } = await createThreadServer({
      type,
      createdBy: user.id,
      participantIds,
      roles,
      listingId,
      shopId,
      contextTypes,
      contextIds,
    });

    if (existing) {
      return NextResponse.json(thread, { status: 409, headers: AUTH_CACHE_HEADERS });
    }

    return NextResponse.json(thread, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Failed to create thread:', error);
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
