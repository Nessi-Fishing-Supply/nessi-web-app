import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL 
  : 'http://localhost:5001';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || (process.env.NODE_ENV === 'production' ? 'your_production_api_key_here' : '');

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  },
});

export interface UserProfileDto {
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  email: string;
}

export async function getUserProfile(token: string | null): Promise<UserProfileDto | null> {
  try {
    const response = await axiosInstance.get('/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 200) {
      return response.data;
    } else if (response.status === 401) {
      console.error('Unauthorized: Logging out user.');
      throw new Error('Unauthorized');
    } else {
      console.error('Failed to fetch user profile');
      return null;
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
      console.error('Unauthorized: Logging out user.');
      throw new Error('Unauthorized');
    } else {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }
}
