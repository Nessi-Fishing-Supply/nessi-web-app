// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

vi.mock('@/libs/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/features/auth/validations/server', () => ({
  validateRegisterInput: vi.fn(),
}));

import { createAdminClient } from '@/libs/supabase/admin';
import { validateRegisterInput } from '@/features/auth/validations/server';

const validBody = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  password: 'Str0ngPass',
  terms: true,
};

function makeRequest(body: object) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.mocked(validateRegisterInput).mockReturnValue(null);
  });

  it('returns 409 with DUPLICATE_EMAIL when signUp returns "User already registered" error', async () => {
    const mockSupabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'User already registered' },
        }),
      },
    };
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const response = await POST(makeRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: 'DUPLICATE_EMAIL' });
  });

  it('returns 400 with original error message when signUp returns a different error', async () => {
    const mockSupabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Password should be at least 6 characters' },
        }),
      },
    };
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const response = await POST(makeRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Password should be at least 6 characters' });
  });
});
