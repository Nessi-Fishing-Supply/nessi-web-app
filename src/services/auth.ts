import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL 
  : 'http://localhost:5002';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || (process.env.NODE_ENV === 'production' ? 'your_production_api_key_here' : '');

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  },
});

export const register = async (data: { firstName: string; lastName: string; email: string; password: string; terms: boolean }) => {
  const response = await axiosInstance.post('/auth/register', data);
  return response.data;
};

export const login = async (data: { email: string; password: string; rememberMe: boolean }) => {
  const response = await axiosInstance.post('/auth/login', data);
  const { AccessToken, RefreshToken, ExpiresIn } = response.data;
  const expiryTime = new Date().getTime() + ExpiresIn * 1000; // Use the actual expiration time returned by the server
  return { AccessToken, RefreshToken, expiryTime };
};

export const forgotPassword = async (data: { email: string }): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axiosInstance.post('/auth/forgot-password', data);
    return { success: true, message: response.data.message };
  } catch (error) {
    console.error('Error sending forgot password email:', error);
    return { success: false, message: 'Failed to send reset link' };
  }
};

export const resetPassword = async (data: { token: string; newPassword: string; confirmNewPassword: string }) => {
  const response = await axiosInstance.post('/auth/reset-password', data);
  return response.data;
};

export const verifyEmail = async (token: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axiosInstance.post('/auth/verify-email', { token });
    return response.data;
  } catch (error) {
    console.error('Error verifying email:', error);
    return { success: false, message: 'Verification failed' };
  }
};

export const resendVerificationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axiosInstance.post('/auth/resend-verification-email', { email });
    return { success: true, message: response.data.message };
  } catch (error) {
    console.error('Error resending verification email:', error);
    return { success: false, message: 'Failed to resend verification email' };
  }
};

export const refreshToken = async (refreshToken: string) => {
  try {
    const response = await axiosInstance.post('/auth/refresh-token', { refreshToken });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error('Error refreshing token:', error.response.data);
    }
    throw error;
  }
};

export const logout = async (token: string, setAuthenticated: (isAuthenticated: boolean) => void, setToken: (token: string | null) => void) => {
  try {
    const response = await axiosInstance.post('/auth/logout', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    setAuthenticated(false);
    setToken(null);
    return response.data;
  } catch (error) {
    console.error('Logout failed:', error);
    setAuthenticated(false);
    setToken(null);
    throw error;
  }
};
