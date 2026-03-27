import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { createFollowServer, deleteFollowServer } from '@/features/follows/services/follow-server';
import type { FollowTargetType } from '@/features/follows/types/follow';
import { NextResponse } from 'next/server';

// Follow a member or shop
export async function POST(req: Request) {
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

    const body = await req.json();
    const { target_type, target_id } = body;

    if (!target_type || !['member', 'shop'].includes(target_type)) {
      return NextResponse.json(
        { error: 'Invalid target_type. Must be "member" or "shop"' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!target_id || typeof target_id !== 'string' || target_id.trim() === '') {
      return NextResponse.json(
        { error: 'target_id is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const follow = await createFollowServer(user.id, target_type as FollowTargetType, target_id);

    return NextResponse.json(follow, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot follow yourself')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }
    if (error instanceof Error && error.message.includes('Already following')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }
    console.error('Error creating follow:', error);
    return NextResponse.json(
      { error: 'Failed to create follow' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Unfollow a member or shop
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
    const target_type = searchParams.get('target_type');
    const target_id = searchParams.get('target_id');

    if (!target_type || !['member', 'shop'].includes(target_type)) {
      return NextResponse.json(
        { error: 'Invalid target_type. Must be "member" or "shop"' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!target_id || target_id.trim() === '') {
      return NextResponse.json(
        { error: 'target_id is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const result = await deleteFollowServer(user.id, target_type as FollowTargetType, target_id);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Not following' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json({ success: true }, { status: 200, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error deleting follow:', error);
    return NextResponse.json(
      { error: 'Failed to delete follow' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
