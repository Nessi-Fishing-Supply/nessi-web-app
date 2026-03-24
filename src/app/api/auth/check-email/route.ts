import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const { email } = body;

    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const admin = createAdminClient();
    const { data, error: listError } = await admin.auth.admin.listUsers();

    if (listError) {
      console.error('List users error:', listError);
      return NextResponse.json(
        { error: 'An unexpected error occurred' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    const emailTaken = data.users.some((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (emailTaken) {
      return NextResponse.json(
        { available: false, error: 'DUPLICATE_EMAIL' },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json({ available: true }, { status: 200, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Check email error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
