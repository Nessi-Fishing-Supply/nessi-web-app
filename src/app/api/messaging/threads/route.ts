import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { ThreadType } from '@/features/messaging/types/thread';
import {
  getThreadsServer,
  createThreadServer,
} from '@/features/messaging/services/messaging-server';

const VALID_THREAD_TYPES: ThreadType[] = ['inquiry', 'direct', 'offer', 'custom_request'];

// List the authenticated user's message threads with optional type filter
export async function GET(request: NextRequest) {
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

    const type = request.nextUrl.searchParams.get('type') as ThreadType | null;

    if (type && !VALID_THREAD_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid thread type. Must be one of: ${VALID_THREAD_TYPES.join(', ')}` },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const threads = await getThreadsServer(user.id, type ?? undefined);

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

    const { thread, existing } = await createThreadServer({
      type,
      createdBy: user.id,
      participantIds,
      roles,
      listingId,
      shopId,
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
