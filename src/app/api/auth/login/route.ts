import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/libs/supabase';
import { LoginData } from '@/types/auth';

// Handle user authentication and session creation
export async function POST(req: NextRequest) {
  try {
    const data = await req.json() as LoginData;
    
    if (!data.email?.trim() || !data.password?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createSupabaseServer();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email.toLowerCase(),
      password: data.password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Login successful',
      session: authData.session,
      user: authData.user,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
