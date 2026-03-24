import { RegisterData, LoginData, AuthResponse } from './auth';

// Base props for all auth forms with generic type support
export interface AuthFormProps<TData = any, TResponse = TData> {
  onSuccess?: (response: TResponse) => void;
  onError?: (error: any) => void;
}

// Form data types
export type LoginFormData = LoginData;
export type RegisterFormData = RegisterData;
export type ForgotPasswordFormData = { email: string };
export type OtpVerificationData = {
  email: string;
  token: string;
  type: 'signup' | 'recovery' | 'email_change';
};

// Form response types
export type AuthFormResponse = AuthResponse;
