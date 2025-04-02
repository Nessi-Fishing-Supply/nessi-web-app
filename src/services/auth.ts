import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Register
export const register = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  terms: boolean;
}) => {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Registration failed');
  return json;
};

// Login
export const login = async (data: {
  email: string;
  password: string;
  rememberMe?: boolean;
}) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Login failed');

  const { session, user } = json;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    user,
  };
};

// Logout
export const logout = async (): Promise<void> => {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || 'Logout failed');
  }
};

// Profile
export const getUserProfile = async () => {
  const supabase = createClientComponentClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  return data.user;
};

// Forgot Password
export const forgotPassword = async (data: { email: string }): Promise<{ message: string }> => {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to send reset link');
  return json;
};

// Reset Password
export const resetPassword = async (data: {
  newPassword: string;
  confirmNewPassword: string;
}) => {
  if (data.newPassword !== data.confirmNewPassword) {
    throw new Error('Passwords do not match');
  }

  const supabase = createClientComponentClient();
  const { error } = await supabase.auth.updateUser({ password: data.newPassword });

  if (error) throw new Error(error.message);
  return { message: 'Password updated successfully' };
};
