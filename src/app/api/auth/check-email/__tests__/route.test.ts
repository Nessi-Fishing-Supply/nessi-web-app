// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

vi.mock('@/libs/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/libs/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';

function makeRequest(body: object) {
  return new Request('http://localhost/api/auth/check-email', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const mockAuthenticatedUser = { id: 'u1', email: 'current@example.com' };

function setupAuth(user: object | null = mockAuthenticatedUser) {
  const mockSupabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
  };
  vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
}

function setupAdmin(users: { email?: string }[]) {
  const mockAdmin = {
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users }, error: null }),
      },
    },
  };
  vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any);
}

describe('POST /api/auth/check-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session is present', async () => {
    setupAuth(null);
    setupAdmin([]);

    const response = await POST(makeRequest({ email: 'test@example.com' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when email is missing', async () => {
    setupAuth();
    setupAdmin([]);

    const response = await POST(makeRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Email is required' });
  });

  it('returns 400 when email is empty string', async () => {
    setupAuth();
    setupAdmin([]);

    const response = await POST(makeRequest({ email: '   ' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Email is required' });
  });

  it('returns 400 when email format is invalid', async () => {
    setupAuth();
    setupAdmin([]);

    const response = await POST(makeRequest({ email: 'not-an-email' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid email format' });
  });

  it('returns 409 with DUPLICATE_EMAIL when email is already registered', async () => {
    setupAuth();
    setupAdmin([{ email: 'taken@example.com' }]);

    const response = await POST(makeRequest({ email: 'taken@example.com' }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ available: false, error: 'DUPLICATE_EMAIL' });
  });

  it('returns 409 with case-insensitive email matching', async () => {
    setupAuth();
    setupAdmin([{ email: 'Taken@Example.com' }]);

    const response = await POST(makeRequest({ email: 'taken@example.com' }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ available: false, error: 'DUPLICATE_EMAIL' });
  });

  it('returns 200 with available true when email is not registered', async () => {
    setupAuth();
    setupAdmin([{ email: 'other@example.com' }]);

    const response = await POST(makeRequest({ email: 'new@example.com' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ available: true });
  });

  it('returns 500 when an unexpected error occurs', async () => {
    vi.mocked(createClient).mockRejectedValue(new Error('DB connection failed'));

    const response = await POST(makeRequest({ email: 'test@example.com' }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'An unexpected error occurred' });
  });
});
