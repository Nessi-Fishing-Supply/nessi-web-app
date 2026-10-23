import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { getExistingFlagServer } from '@/features/flags/services/flag-server';
import { FLAG_TARGET_TYPES } from '@/features/flags/constants/reasons';
import type { FlagTargetType } from '@/features/flags/types/flag';
import { NextResponse } from 'next/server';

// Checks whether the current user has already flagged a specific item.
export async function GET(req: Request) {
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
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');

    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: 'targetType and targetId are required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const validTargetTypes = FLAG_TARGET_TYPES.map((t) => t.value);
    if (!validTargetTypes.includes(targetType as FlagTargetType)) {
      return NextResponse.json(
        { error: 'Invalid targetType' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const existing = await getExistingFlagServer(user.id, targetType as FlagTargetType, targetId);

    return NextResponse.json({ exists: !!existing }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error checking flag:', error);
    return NextResponse.json(
      { error: 'Failed to check flag' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
