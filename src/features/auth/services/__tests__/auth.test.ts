// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withTimeout,
  AUTH_TIMEOUT_MS,
  register,
  login,
  logout,
  getUserProfile,
  verifyOtp,
  sendResetCode,
  changeEmail,
  verifyEmailChange,
  resendEmailChangeCode,
  checkEmailAvailable,
} from '../auth';

const TIMEOUT_MESSAGE = 'Something went wrong. Check your connection and try again.';

vi.mock('@/libs/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/libs/supabase/client';

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves normally when promise settles before timeout', async () => {
    const fast = Promise.resolve('ok');
    await expect(withTimeout(fast, 1000)).resolves.toBe('ok');
  });

  it('rejects with timeout message when promise is slower than the deadline', async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('late'), 5000));
    const result = withTimeout(slow, 1000);
    vi.advanceTimersByTime(1001);
    await expect(result).rejects.toThrow(TIMEOUT_MESSAGE);
  });

  it('does not reject when promise resolves just before the deadline', async () => {
    const close = new Promise<string>((resolve) => setTimeout(() => resolve('just in time'), 999));
    const result = withTimeout(close, 1000);
    vi.advanceTimersByTime(999);
    await expect(result).resolves.toBe('just in time');
  });
});

describe('register', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const validData = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'Str0ngPass',
    terms: true,
  };

  it('passes AbortController signal to fetch', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: '1' } }), { status: 200 }));

    await register(validData);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const callArgs = fetchSpy.mock.calls[0][1];
    expect(callArgs?.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws timeout message when fetch is aborted after AUTH_TIMEOUT_MS', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      (_url, options) =>
        new Promise<Response>((_resolve, reject) => {
          const sig = options?.signal as AbortSignal | undefined;
          if (sig) {
            sig.addEventListener('abort', () => {
              const err = new Error('The operation was aborted.');
              err.name = 'AbortError';
              reject(err);
            });
          }
        }),
    );

    const result = register(validData);
    vi.advanceTimersByTime(AUTH_TIMEOUT_MS + 1);
    await expect(result).rejects.toThrow(TIMEOUT_MESSAGE);
  });

  it('throws the server error message when the response is not ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Email already in use' }), { status: 400 }),
    );

    await expect(register(validData)).rejects.toThrow('Email already in use');
  });

  it('throws DUPLICATE_EMAIL when the API returns 409 with that error code', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'DUPLICATE_EMAIL' }), { status: 409 }),
    );

    await expect(register(validData)).rejects.toThrow('DUPLICATE_EMAIL');
  });
});

describe('login', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('times out and throws timeout message when Supabase is slow', async () => {
    const neverResolves = new Promise<never>(() => {});
    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockReturnValue(neverResolves),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const result = login({ email: 'a@b.com', password: 'pass' });
    vi.advanceTimersByTime(AUTH_TIMEOUT_MS + 1);
    await expect(result).rejects.toThrow(TIMEOUT_MESSAGE);
  });

  it('returns user and session on successful login', async () => {
    const mockUser = { id: 'u1', email: 'a@b.com' };
    const mockSession = { access_token: 'tok' };
    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const result = await login({ email: 'a@b.com', password: 'pass' });
    expect(result).toEqual({ user: mockUser, session: mockSession });
  });

  it('throws the Supabase error message when login fails', async () => {
    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' },
        }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await expect(login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(
      'Invalid credentials',
    );
  });
});

describe('logout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls supabase.auth.signOut without a timeout wrapper', async () => {
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = { auth: { signOut: signOutMock } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    // logout should resolve even with real timers (no withTimeout involved)
    await expect(logout()).resolves.toBeUndefined();
    expect(signOutMock).toHaveBeenCalledOnce();
  });

  it('throws when signOut returns an error', async () => {
    const mockSupabase = {
      auth: { signOut: vi.fn().mockResolvedValue({ error: { message: 'Sign out failed' } }) },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await expect(logout()).rejects.toThrow('Sign out failed');
  });
});

describe('getUserProfile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls supabase.auth.getUser without a timeout wrapper', async () => {
    const mockUser = { id: 'u1', email: 'a@b.com' };
    const getUserMock = vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null });
    const mockSupabase = { auth: { getUser: getUserMock } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const result = await getUserProfile();
    expect(result).toEqual(mockUser);
    expect(getUserMock).toHaveBeenCalledOnce();
  });

  it('throws when getUser returns an error', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await expect(getUserProfile()).rejects.toThrow('Not authenticated');
  });
});

describe('verifyOtp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls supabase.auth.verifyOtp with correct params for signup', async () => {
    const verifyOtpMock = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const mockSupabase = { auth: { verifyOtp: verifyOtpMock } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await verifyOtp({ email: 'a@b.com', token: '123456', type: 'signup' });
    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: 'a@b.com',
      token: '123456',
      type: 'signup',
    });
  });

  it('calls supabase.auth.verifyOtp with correct params for email_change', async () => {
    const verifyOtpMock = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const mockSupabase = { auth: { verifyOtp: verifyOtpMock } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await verifyOtp({ email: 'new@b.com', token: '111111', type: 'email_change' });
    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: 'new@b.com',
      token: '111111',
      type: 'email_change',
    });
  });

  it('calls supabase.auth.verifyOtp with correct params for recovery', async () => {
    const verifyOtpMock = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const mockSupabase = { auth: { verifyOtp: verifyOtpMock } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await verifyOtp({ email: 'a@b.com', token: '654321', type: 'recovery' });
    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: 'a@b.com',
      token: '654321',
      type: 'recovery',
    });
  });

  it('throws when verifyOtp returns an error', async () => {
    const mockSupabase = {
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Token has expired or is invalid' },
        }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
    await expect(verifyOtp({ email: 'a@b.com', token: '000000', type: 'signup' })).rejects.toThrow(
      'Token has expired or is invalid',
    );
  });

  it('times out after AUTH_TIMEOUT_MS', async () => {
    const neverResolves = new Promise<never>(() => {});
    const mockSupabase = { auth: { verifyOtp: vi.fn().mockReturnValue(neverResolves) } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
    const result = verifyOtp({ email: 'a@b.com', token: '123456', type: 'signup' });
    vi.advanceTimersByTime(AUTH_TIMEOUT_MS + 1);
    await expect(result).rejects.toThrow(TIMEOUT_MESSAGE);
  });
});

describe('sendResetCode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls resetPasswordForEmail without redirectTo', async () => {
    const resetMock = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = { auth: { resetPasswordForEmail: resetMock } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
    await sendResetCode({ email: 'a@b.com' });
    expect(resetMock).toHaveBeenCalledWith('a@b.com');
  });

  it('throws when resetPasswordForEmail returns an error', async () => {
    const mockSupabase = {
      auth: {
        resetPasswordForEmail: vi
          .fn()
          .mockResolvedValue({ error: { message: 'Rate limit exceeded' } }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
    await expect(sendResetCode({ email: 'a@b.com' })).rejects.toThrow('Rate limit exceeded');
  });
});

describe('changeEmail', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls updateUser with new email and returns success message', async () => {
    const updateUserMock = vi.fn().mockResolvedValue({ data: { user: {} }, error: null });
    const mockSupabase = { auth: { updateUser: updateUserMock } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const result = await changeEmail({ newEmail: 'new@example.com' });
    expect(updateUserMock).toHaveBeenCalledWith({ email: 'new@example.com' });
    expect(result).toEqual({ message: 'Verification code sent to your new email.' });
  });

  it('throws when updateUser returns an error', async () => {
    const mockSupabase = {
      auth: {
        updateUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: { message: 'Email already in use' } }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await expect(changeEmail({ newEmail: 'taken@example.com' })).rejects.toThrow(
      'Email already in use',
    );
  });

  it('times out after AUTH_TIMEOUT_MS', async () => {
    const neverResolves = new Promise<never>(() => {});
    const mockSupabase = { auth: { updateUser: vi.fn().mockReturnValue(neverResolves) } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const result = changeEmail({ newEmail: 'new@example.com' });
    vi.advanceTimersByTime(AUTH_TIMEOUT_MS + 1);
    await expect(result).rejects.toThrow(TIMEOUT_MESSAGE);
  });
});

describe('verifyEmailChange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('delegates to verifyOtp with type email_change', async () => {
    const verifyOtpMock = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const mockSupabase = { auth: { verifyOtp: verifyOtpMock } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const result = await verifyEmailChange({ email: 'new@example.com', token: '123456' });
    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: 'new@example.com',
      token: '123456',
      type: 'email_change',
    });
    expect(result).toEqual({ user: { id: 'u1' } });
  });

  it('throws when verifyOtp returns an error', async () => {
    const mockSupabase = {
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await expect(verifyEmailChange({ email: 'new@example.com', token: '000000' })).rejects.toThrow(
      'Invalid token',
    );
  });
});

describe('resendEmailChangeCode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls updateUser with email and returns success message', async () => {
    const updateUserMock = vi.fn().mockResolvedValue({ data: { user: {} }, error: null });
    const mockSupabase = { auth: { updateUser: updateUserMock } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const result = await resendEmailChangeCode({ newEmail: 'new@example.com' });
    expect(updateUserMock).toHaveBeenCalledWith({ email: 'new@example.com' });
    expect(result).toEqual({ message: 'Verification code sent to your new email.' });
  });

  it('throws when updateUser returns an error', async () => {
    const mockSupabase = {
      auth: {
        updateUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: { message: 'Rate limit exceeded' } }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await expect(resendEmailChangeCode({ newEmail: 'new@example.com' })).rejects.toThrow(
      'Rate limit exceeded',
    );
  });
});

describe('checkEmailAvailable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns available true when API responds with 200', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ available: true }), { status: 200 }),
    );

    const result = await checkEmailAvailable({ email: 'new@example.com' });
    expect(result).toEqual({ available: true });
  });

  it('passes AbortController signal to fetch', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: true }), { status: 200 }));

    await checkEmailAvailable({ email: 'new@example.com' });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const callArgs = fetchSpy.mock.calls[0][1];
    expect(callArgs?.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws DUPLICATE_EMAIL when API responds with 409', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ available: false, error: 'DUPLICATE_EMAIL' }), { status: 409 }),
    );

    await expect(checkEmailAvailable({ email: 'taken@example.com' })).rejects.toThrow(
      'DUPLICATE_EMAIL',
    );
  });

  it('throws the server error message on other error responses', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Invalid email format' }), { status: 400 }),
    );

    await expect(checkEmailAvailable({ email: 'bad' })).rejects.toThrow('Invalid email format');
  });

  it('throws timeout message when fetch is aborted after AUTH_TIMEOUT_MS', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      (_url, options) =>
        new Promise<Response>((_resolve, reject) => {
          const sig = options?.signal as AbortSignal | undefined;
          if (sig) {
            sig.addEventListener('abort', () => {
              const err = new Error('The operation was aborted.');
              err.name = 'AbortError';
              reject(err);
            });
          }
        }),
    );

    const result = checkEmailAvailable({ email: 'test@example.com' });
    vi.advanceTimersByTime(AUTH_TIMEOUT_MS + 1);
    await expect(result).rejects.toThrow(TIMEOUT_MESSAGE);
  });
});
