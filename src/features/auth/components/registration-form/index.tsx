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
import styles from './registration-form.module.scss';

interface RegisterFormProps extends AuthFormProps<RegisterFormData, AuthFormResponse> {
  onSwitchToLogin?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onError, onSwitchToLogin }) => {
  const { isLoading, error, setLoading, setError } = useFormState();

  const methods = useForm<RegisterData>({
    resolver: yupResolver(registerSchema),
    mode: 'onBlur',
  });

  const handleSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const response = await registerUser(data);
      if (onSuccess) onSuccess({ ...response, email: data.email });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === 'DUPLICATE_EMAIL') {
          setError('DUPLICATE_EMAIL');
        } else {
          setError(error.message);
        }
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
        {error === 'DUPLICATE_EMAIL' ? (
          <div role="alert" className="errorMessage">
            An account with that email already exists.{' '}
            <button type="button" className={styles.signInLink} onClick={onSwitchToLogin}>
              Sign in
            </button>{' '}
            instead?
          </div>
        ) : (
          error && (
            <div role="alert" className="errorMessage">
              {error}
            </div>
          )
        )}

        <Grid columns={2}>
          <Input
            name="firstName"
            label="First Name"
            type="text"
            isRequired
            autoComplete="given-name"
          />
          <Input
            name="lastName"
            label="Last Name"
            type="text"
            isRequired
            autoComplete="family-name"
          />
        </Grid>
        <Input name="email" label="Email" type="email" isRequired autoComplete="email" />
        <Input
          name="password"
          label="Password"
          type="password"
          showPasswordStrength
          isRequired
          autoComplete="new-password"
        />
        <Checkbox name="terms" label="I accept the terms and conditions" isRequired />
        <Button type="submit" fullWidth loading={isLoading}>
          Sign Up
        </Button>
      </form>
    </FormProvider>
  );
};

export default RegisterForm;
