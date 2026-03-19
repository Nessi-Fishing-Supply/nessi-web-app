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
import { checkOnboardingComplete } from '@/features/auth/services/onboarding';
import { AuthFormProps, LoginFormData } from '@/features/auth/types/forms';
import { HiCheck, HiExclamation } from 'react-icons/hi';
import styles from './login-form.module.scss';

interface LoginFormProps extends AuthFormProps<LoginFormData> {
  banner?: { type: 'verified' } | null;
  onClose?: () => void;
  onResendVerification?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onError,
  onClose,
  onResendVerification,
  banner,
}) => {
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
      const { isComplete } = await checkOnboardingComplete();
      if (!isComplete) {
        window.location.href = '/onboarding';
        return;
      }
      onSuccess?.call(null, data);
    } catch (error) {
      const err = error as Error;
      setError(err.message || 'Login failed. Please try again.');
      onError?.call(null, err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    onClose?.();
    router.push('/auth/forgot-password');
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
        {banner?.type === 'verified' && (
          <div
            className={`${styles.banner} ${styles.bannerSuccess}`}
            role="status"
            aria-live="polite"
          >
            <div className={`${styles.bannerIcon} ${styles.bannerIconSuccess}`}>
              <HiCheck aria-hidden="true" />
            </div>
            <p className={`${styles.bannerText} ${styles.bannerTextSuccess}`}>
              Email verified! Sign in to get started.
            </p>
          </div>
        )}

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
              {onResendVerification && (
                <button type="button" onClick={onResendVerification} className={styles.resendLink}>
                  Resend verification email
                </button>
              )}
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
        <button type="button" onClick={handleForgotPassword} className={styles.forgotLink}>
          Forgot your password?
        </button>
      </form>
    </FormProvider>
  );
};

export default LoginForm;
