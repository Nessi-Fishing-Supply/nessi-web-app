'use client';

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { loginSchema } from '@/validations/auth';
import { LoginData } from '@/types/auth';
import { useFormState } from '@/hooks/useFormState';
import { Input, Button, AppLink } from '@/components/controls';
import { login } from '@/services/auth';
import { useAuth } from '@/context/auth';
import { useRouter } from 'next/navigation';
import { AuthFormProps, LoginFormData } from '@/types/forms';

/**
 * Login form component
 * Handles user authentication and session management
 * Supports redirect after successful login
 * Provides error handling and loading states
 */
const LoginForm: React.FC<AuthFormProps<LoginFormData>> = ({ 
  onSuccess, 
  onError,
  redirectUrl = '/dashboard' 
}) => {
  const { setAuthenticated, setToken, setUser } = useAuth();
  const { isLoading, error, setLoading, setError } = useFormState();
  const router = useRouter();
  
  const methods = useForm<LoginData>({
    resolver: yupResolver(loginSchema),
    mode: 'onBlur',
  });

  const handleSubmit = async (data: LoginData) => {
    setLoading(true);
    try {
      const { user } = await login({
        email: data.email,
        password: data.password,
      });

      setAuthenticated(true);
      setToken(null);
      setUser(user);
      setError(null);
      router.push(redirectUrl);
      onSuccess?.call(null, data);
    } catch (error) {
      const err = error as Error;
      setError(err.message || 'Login failed. Please try again.');
      onError?.call(null, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
        {error && <div className="errorMessage">{error}</div>}
        <Input name="email" label="Email" type="email" isRequired />
        <Input name="password" label="Password" type="password" isRequired />
        <Button type="submit" fullWidth marginBottom loading={isLoading}>
          Submit
        </Button>
        <AppLink fullWidth center underline size="sm" href="/auth/forgot-password">
          Forgot your password?
        </AppLink>
      </form>
    </FormProvider>
  );
};

export default LoginForm;