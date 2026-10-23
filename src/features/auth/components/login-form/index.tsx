'use client';

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/navigation';
import { loginSchema } from '@/features/auth/validations/auth';
import { LoginData } from '@/features/auth/types/auth';
import { useFormState } from '@/features/shared/hooks/use-form-state';
import { Input, Button } from '@/components/controls';
import { login } from '@/features/auth/services/auth';
import { AuthFormProps, LoginFormData } from '@/features/auth/types/forms';
import { HiExclamation } from 'react-icons/hi';
import styles from './login-form.module.scss';

interface LoginFormProps extends AuthFormProps<LoginFormData> {
  onClose?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError, onClose }) => {
  const { isLoading, error, setLoading, setError } = useFormState();
  const router = useRouter();

  const methods = useForm<LoginData>({
    resolver: yupResolver(loginSchema),
    mode: 'onBlur',
  });

  const isUnverifiedError = error?.includes('Email not confirmed');

  const handleSubmit = async (data: LoginData) => {
    setLoading(true);
    try {
      await login({
        email: data.email,
        password: data.password,
      });

      setError(null);
      onSuccess?.call(null, data);
    } catch (error) {
      const err = error as Error;
      setError(err.message || 'Login failed. Please try again.');
      onError?.call(null, err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    onClose?.();
    router.push('/auth/reset-password');
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
        {error && !isUnverifiedError && (
          <div className="errorMessage" role="alert">
            {error}
          </div>
        )}

        {isUnverifiedError && (
          <div
            className={`${styles.banner} ${styles.bannerError}`}
            role="alert"
            aria-live="assertive"
          >
            <div className={`${styles.bannerIcon} ${styles.bannerIconError}`}>
              <HiExclamation aria-hidden="true" />
            </div>
            <div className={styles.unverifiedBody}>
              <p className={`${styles.bannerText} ${styles.bannerTextError}`}>
                Your email hasn&apos;t been verified yet.
              </p>
              <button
                type="button"
                className={styles.resendLink}
                onClick={async () => {
                  const email = methods.getValues('email');
                  if (!email) return;
                  try {
                    const { resendVerification } = await import('@/features/auth/services/auth');
                    await resendVerification({ email });
                    setError('Verification code sent! Check your inbox.');
                  } catch {
                    setError('Failed to resend. Please try again.');
                  }
                }}
              >
                Resend verification code
              </button>
            </div>
          </div>
        )}

        <Input name="email" label="Email" type="email" isRequired autoComplete="email" />
        <Input
          name="password"
          label="Password"
          type="password"
          isRequired
          autoComplete="current-password"
        />
        <Button type="submit" fullWidth marginBottom loading={isLoading}>
          Submit
        </Button>
        <button type="button" onClick={handleResetPassword} className={styles.forgotLink}>
          Reset your password
        </button>
      </form>
    </FormProvider>
  );
};

export default LoginForm;
