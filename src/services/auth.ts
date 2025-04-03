import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RegisterData, LoginData, ResetPasswordData, AuthResponse } from '@/types/auth';

// Register new user
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json;
  } catch (error) {
    throw error instanceof Error ? error : new Error('An unexpected error occurred');
  }
};

// Authenticate user and create session
export const login = async (data: LoginData) => {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');

    const { session, user, accessToken } = json;

    // Store the access token securely (e.g., in cookies or localStorage)
    localStorage.setItem('accessToken', accessToken);

    return {
      accessToken,
      user,
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error('An unexpected error occurred');
  }
};

// End user session
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

// Get current user profile
export const getUserProfile = async () => {
  try {
    const supabase = createClientComponentClient();
    const token = localStorage.getItem('accessToken'); // Retrieve token

    if (!token) throw new Error('Auth session missing!');

    const { data, error } = await supabase.auth.getUser();

    if (error) throw new Error(error.message);
    return data.user;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to fetch user profile');
  }
};

// Send password reset email
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

// Update user password
export const resetPassword = async (data: ResetPasswordData): Promise<AuthResponse> => {
  try {
    if (data.newPassword !== data.confirmNewPassword) {
      throw new Error('Passwords do not match');
    }

    const supabase = createClientComponentClient();
    const { error } = await supabase.auth.updateUser({ password: data.newPassword });

    if (error) throw new Error(error.message);
    return { message: 'Password updated successfully' };
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to reset password');
  }
};
