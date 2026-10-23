import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Sanitizes the `next` redirect parameter to prevent open redirect attacks.
 * Only allows relative paths starting with `/` that don't start with `//`
 * (protocol-relative URLs like `//evil.com` would redirect off-site).
 */
function sanitizeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard';
  }
  return next;
}

// Completes the OAuth or email verification flow and redirects the user.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = sanitizeRedirectPath(searchParams.get('next'));

  const headers = { 'Cache-Control': 'private, no-store' };

  // Handle token_hash from Supabase email templates (verifyOtp flow)
  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: (type as EmailOtpType) || 'email',
    });

    if (error) {
      console.error('Auth callback error (verifyOtp):', { type, error: error.message });
      return NextResponse.redirect(`${origin}/?auth_error=true`, { headers });
    }

    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/auth/reset-password`, { headers });
    }
    return NextResponse.redirect(`${origin}/?verified=true`, { headers });
  }

  // Handle code from client-initiated PKCE flows (exchangeCodeForSession)
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error (exchangeCode):', { type, error: error.message });
      return NextResponse.redirect(`${origin}/?auth_error=true`, { headers });
    }

    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/auth/reset-password`, { headers });
    }
    if (type === 'signup') {
      return NextResponse.redirect(`${origin}/?verified=true`, { headers });
    }
    return NextResponse.redirect(`${origin}${next}`, { headers });
  }

  console.error('Auth callback error: no code or token_hash provided', { type });
  return NextResponse.redirect(`${origin}/?auth_error=true`, { headers });
}
