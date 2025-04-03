import { RegisterData, LoginData, AuthResponse } from './auth';

// Base props for all auth forms with generic type support
export interface AuthFormProps<TData = any, TResponse = TData> {
  onSuccess?: (response: TResponse) => void;
  onError?: (error: any) => void;
  redirectUrl?: string;
}

// Form state management
export interface FormState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

// Form data types
export type LoginFormData = LoginData;
export type RegisterFormData = RegisterData;
export type ForgotPasswordFormData = { email: string };

// Form response types
export type AuthFormResponse = AuthResponse;
