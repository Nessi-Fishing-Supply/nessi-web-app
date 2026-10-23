import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { createFlagServer } from '@/features/flags/services/flag-server';
import { flagSchema } from '@/features/flags/validations/flag';
import type { FlagFormData } from '@/features/flags/types/flag';
import { NextResponse } from 'next/server';
import { ValidationError } from 'yup';

// Submits a flag reporting a listing or user for review by the Nessi team.
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
    const validated = (await flagSchema.validate(body, {
      abortEarly: false,
    })) as FlagFormData;

    const flag = await createFlagServer(user.id, validated);

    return NextResponse.json(flag, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.errors.join(', ') },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }
    if (error instanceof Error && error.message.includes('already flagged')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }
    console.error('Error creating flag:', error);
    return NextResponse.json(
      { error: 'Failed to create flag' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
