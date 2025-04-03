import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/libs/supabase';
import { RegisterData } from '@/types/auth';

// Handle new user registration
export async function POST(req: NextRequest) {
  try {
    const data = await req.json() as RegisterData;

    if (!data.email?.trim() || !data.password?.trim() || !data.firstName?.trim() || !data.lastName?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (!data.terms) {
      return NextResponse.json({ error: 'Terms must be accepted' }, { status: 400 });
    }

    const supabase = createSupabaseServer();
    const { error } = await supabase.auth.signUp({
      email: data.email.toLowerCase(),
      password: data.password,
      options: {
        data: {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Registration successful! A verification email has been sent.',
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
