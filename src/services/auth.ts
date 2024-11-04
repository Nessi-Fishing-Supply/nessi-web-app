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

export const login = async (data: { email: string; password: string; }) => {
  const response = await axiosInstance.post('/auth/login', data);
  return response.data;
};

export const forgotPassword = async (data: { email: string }) => {
  const response = await axiosInstance.post('/auth/forgot-password', data);
  return response.data;
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
