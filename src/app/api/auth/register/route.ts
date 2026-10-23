import { createAdminClient } from '@/libs/supabase/admin';
import { validateRegisterInput } from '@/features/auth/validations/server';
import { NextResponse } from 'next/server';

const AUTH_HEADERS = { 'Cache-Control': 'private, no-store' };

// Creates a new user account and sends a verification email.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password, terms } = body;

    const validationError = validateRegisterInput({ firstName, lastName, email, password, terms });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400, headers: AUTH_HEADERS });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstName, lastName },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'DUPLICATE_EMAIL' },
          { status: 409, headers: AUTH_HEADERS },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400, headers: AUTH_HEADERS });
    }

    return NextResponse.json(
      { message: 'Registration successful. Please check your email to verify your account.' },
      { status: 201, headers: AUTH_HEADERS },
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500, headers: AUTH_HEADERS },
    );
  }
}
