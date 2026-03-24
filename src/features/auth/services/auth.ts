import { createClient } from '@/libs/supabase/client';

export const AUTH_TIMEOUT_MS = 8000;

export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Something went wrong. Check your connection and try again.'));
    }, ms);
  });

  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
};

export const register = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  terms: boolean;
}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Something went wrong. Check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export const login = async (data: { email: string; password: string }) => {
  const supabase = createClient();
  const { data: authData, error } = await withTimeout(
    supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    }),
    AUTH_TIMEOUT_MS,
  );

  if (error) throw new Error(error.message);
  return { user: authData.user, session: authData.session };
};

export const logout = async () => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
};

export const getUserProfile = async () => {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return user;
};

export const sendResetCode = async (data: { email: string }) => {
  const supabase = createClient();
  const { error } = await withTimeout(
    supabase.auth.resetPasswordForEmail(data.email),
    AUTH_TIMEOUT_MS,
  );

  if (error) throw new Error(error.message);
  return { message: 'Reset code sent! Check your email.' };
};

export const resetPassword = async (data: { newPassword: string; confirmNewPassword: string }) => {
  if (data.newPassword !== data.confirmNewPassword) {
    throw new Error('Passwords do not match');
  }

  const supabase = createClient();
  const { error } = await withTimeout(
    supabase.auth.updateUser({
      password: data.newPassword,
    }),
    AUTH_TIMEOUT_MS,
  );

  if (error) throw new Error(error.message);
  return { message: 'Password updated successfully' };
};

export const verifyOtp = async (data: {
  email: string;
  token: string;
  type: 'signup' | 'recovery' | 'email_change';
}) => {
  const supabase = createClient();
  const { data: authData, error } = await withTimeout(
    supabase.auth.verifyOtp({
      email: data.email,
      token: data.token,
      type: data.type,
    }),
    AUTH_TIMEOUT_MS,
  );

  if (error) throw new Error(error.message);
  return { user: authData.user };
};

export const resendVerification = async (data: { email: string }) => {
  const supabase = createClient();
  const { error } = await withTimeout(
    supabase.auth.resend({
      type: 'signup',
      email: data.email,
    }),
    AUTH_TIMEOUT_MS,
  );

  if (error) throw new Error(error.message);
  return { message: 'Verification email sent!' };
};

export const changeEmail = async (data: { newEmail: string }) => {
  const supabase = createClient();
  const { error } = await withTimeout(
    supabase.auth.updateUser({ email: data.newEmail }),
    AUTH_TIMEOUT_MS,
  );

  if (error) throw new Error(error.message);
  return { message: 'Verification code sent to your new email.' };
};

export const verifyEmailChange = async (data: { email: string; token: string }) => {
  return verifyOtp({ email: data.email, token: data.token, type: 'email_change' });
};

export const resendEmailChangeCode = async (data: { newEmail: string }) => {
  const supabase = createClient();
  const { error } = await withTimeout(
    supabase.auth.updateUser({ email: data.newEmail }),
    AUTH_TIMEOUT_MS,
  );

  if (error) throw new Error(error.message);
  return { message: 'Verification code sent to your new email.' };
};
