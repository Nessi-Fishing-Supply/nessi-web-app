import { createClient } from '@/libs/supabase/client';

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

export const login = async (data: { email: string; password: string }) => {
  const supabase = createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

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
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return user;
};

export const forgotPassword = async (data: { email: string }) => {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
    redirectTo: `${window.location.origin}/api/auth/callback?type=recovery`,
  });

  if (error) throw new Error(error.message);
  return { message: 'Reset link sent! Check your email.' };
};

export const resetPassword = async (data: {
  newPassword: string;
  confirmNewPassword: string;
}) => {
  if (data.newPassword !== data.confirmNewPassword) {
    throw new Error('Passwords do not match');
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: data.newPassword,
  });

  if (error) throw new Error(error.message);
  return { message: 'Password updated successfully' };
};
