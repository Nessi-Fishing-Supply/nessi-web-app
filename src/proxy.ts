import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Onboarding redirect logic for authenticated users
  if (user) {
    const pathname = request.nextUrl.pathname;

    // Skip DB query for API routes, auth routes, and Next.js internals
    const skipOnboardingCheck =
      pathname.startsWith('/api/') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/_next/');

    if (!skipOnboardingCheck) {
      const { data: member } = await supabase
        .from('members')
        .select('onboarding_completed_at')
        .eq('id', user.id)
        .single();

      const onboardingComplete = !!member?.onboarding_completed_at;

      // Completed users visiting /onboarding → redirect to home
      if (onboardingComplete && pathname === '/onboarding') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  }

  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/shop/transfer'))
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
