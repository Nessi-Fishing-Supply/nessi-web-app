'use client';

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { registerSchema } from '@/features/auth/validations/auth';
import { RegisterData } from '@/features/auth/types/auth';
import { useFormState } from '@/features/shared/hooks/use-form-state';
import { Input, Button, Checkbox } from '@/components/controls';
import { register as registerUser } from '@/features/auth/services/auth';
import Grid from '@/components/layout/grid';
import { AuthFormProps, RegisterFormData, AuthFormResponse } from '@/features/auth/types/forms';

/**
 * Registration form component
 * Handles new user registration with email verification
 * Collects user details and validates terms acceptance
 * Provides success/error feedback and loading states
 */
const RegisterForm: React.FC<AuthFormProps<RegisterFormData, AuthFormResponse>> = ({
  onSuccess,
  onError,
}) => {
  const { isLoading, error, success, setLoading, setError, setSuccess } = useFormState();

  const methods = useForm<RegisterData>({
    resolver: yupResolver(registerSchema),
    mode: 'onBlur',
  });

  const handleSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const response = await registerUser(data);
      setSuccess(response.message);
      if (onSuccess) onSuccess(response);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Registration failed. Please try again.');
      }
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
        {error && <div className="errorMessage">{error}</div>}
        {success && <div className="successMessage">{success}</div>}

        <Grid columns={2}>
          <Input name="firstName" label="First Name" type="text" isRequired />
          <Input name="lastName" label="Last Name" type="text" isRequired />
        </Grid>
        <Input name="email" label="Email" type="email" isRequired />
        <Input name="password" label="Password" type="password" showPasswordStrength isRequired />
        <Checkbox name="terms" label="I accept the terms and conditions" isRequired />
        <Button type="submit" fullWidth loading={isLoading}>
          Sign Up
        </Button>
      </form>
    </FormProvider>
  );
};

export default RegisterForm;
