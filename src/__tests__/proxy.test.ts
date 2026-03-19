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

function mockGetUser(user: object | null) {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
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

describe('proxy — /auth/forgot-password', () => {
  it('redirects authenticated user to /', async () => {
    mockGetUser({ id: 'user-1' });
    const request = makeRequest('/auth/forgot-password');
    await proxy(request);
    expect(NextResponse.redirect).toHaveBeenCalledOnce();
    const redirectArg = vi.mocked(NextResponse.redirect).mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/');
  });

  it('does not redirect unauthenticated user', async () => {
    mockGetUser(null);
    const request = makeRequest('/auth/forgot-password');
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

  it('does not redirect authenticated user', async () => {
    mockGetUser({ id: 'user-1' });
    const request = makeRequest('/dashboard');
    await proxy(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});
