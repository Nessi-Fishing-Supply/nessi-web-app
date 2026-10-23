// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/server', () => {
  const NextResponse = {
    next: vi.fn(() => ({ cookies: { set: vi.fn() }, _type: 'next' })),
    redirect: vi.fn((url: URL) => ({ _type: 'redirect', url: url.toString() })),
  };
  return { NextResponse };
});

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { proxy } from '../proxy';

function makeRequest(pathname: string) {
  return {
    headers: new Headers(),
    cookies: {
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn(),
    },
    nextUrl: { pathname },
    url: `http://localhost${pathname}`,
  } as unknown as import('next/server').NextRequest;
}

function mockGetUser(user: object | null, onboardingCompletedAt: string | null = '2026-01-01') {
  const mockSingle = vi.fn().mockResolvedValue({
    data: user ? { onboarding_completed_at: onboardingCompletedAt } : null,
    error: null,
  });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: mockFrom,
  };
  vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(NextResponse.next).mockReturnValue({ cookies: { set: vi.fn() }, _type: 'next' } as any);
  vi.mocked(NextResponse.redirect).mockImplementation(
    (url: string | URL) => ({ _type: 'redirect', url: url.toString() }) as any,
  );
});

describe('proxy — /auth/reset-password', () => {
  it('does not redirect authenticated user (needed for recovery flow)', async () => {
    mockGetUser({ id: 'user-1' });
    const request = makeRequest('/auth/reset-password');
    await proxy(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('does not redirect unauthenticated user', async () => {
    mockGetUser(null);
    const request = makeRequest('/auth/reset-password');
    await proxy(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});

describe('proxy — /auth/callback', () => {
  it('does not redirect authenticated user', async () => {
    mockGetUser({ id: 'user-1' });
    const request = makeRequest('/auth/callback');
    await proxy(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('does not redirect unauthenticated user', async () => {
    mockGetUser(null);
    const request = makeRequest('/auth/callback');
    await proxy(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});

describe('proxy — /dashboard', () => {
  it('redirects unauthenticated user to /', async () => {
    mockGetUser(null);
    const request = makeRequest('/dashboard');
    await proxy(request);
    expect(NextResponse.redirect).toHaveBeenCalledOnce();
    const redirectArg = vi.mocked(NextResponse.redirect).mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/');
  });

  it('does not redirect authenticated user with completed onboarding', async () => {
    mockGetUser({ id: 'user-1' }, '2026-01-01');
    const request = makeRequest('/dashboard');
    await proxy(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('does not redirect authenticated user without completed onboarding (banner handles it)', async () => {
    mockGetUser({ id: 'user-1' }, null);
    const request = makeRequest('/dashboard');
    await proxy(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});

describe('proxy — /onboarding', () => {
  it('redirects completed user away from /onboarding to /', async () => {
    mockGetUser({ id: 'user-1' }, '2026-01-01');
    const request = makeRequest('/onboarding');
    await proxy(request);
    expect(NextResponse.redirect).toHaveBeenCalledOnce();
    const redirectArg = vi.mocked(NextResponse.redirect).mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/');
  });

  it('does not redirect incomplete user visiting /onboarding', async () => {
    mockGetUser({ id: 'user-1' }, null);
    const request = makeRequest('/onboarding');
    await proxy(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated user away from /onboarding', async () => {
    mockGetUser(null);
    const request = makeRequest('/onboarding');
    await proxy(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});
