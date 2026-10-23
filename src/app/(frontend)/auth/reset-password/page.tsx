'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import { Input, Button } from '@/components/controls';
import { sendResetCode, resetPassword } from '@/features/auth/services/auth';
import { resetPasswordSchema } from '@/features/auth/validations/auth';
import { useFormState } from '@/features/shared/hooks/use-form-state';
import { useToast } from '@/components/indicators/toast/context';
import OtpInput from '@/features/auth/components/otp-input';
import styles from './reset-password.module.scss';

type Step = 'email' | 'otp' | 'password';

const emailSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
});

type EmailFormData = { email: string };
type PasswordFormData = { password: string; confirmPassword: string };

function EmailStep({ onSuccess }: { onSuccess: (email: string) => void }) {
  const { isLoading, error, setLoading, setError } = useFormState();

  const methods = useForm<EmailFormData>({
    resolver: yupResolver(emailSchema),
    mode: 'onBlur',
  });

  const handleSubmit = async (data: EmailFormData) => {
    setLoading(true);
    try {
      await sendResetCode({ email: data.email });
      setError(null);
      onSuccess(data.email);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <h1>Reset your password</h1>
      <p>Enter your email address and we&apos;ll send you a code to reset your password.</p>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
        {error && (
          <div className="errorMessage" role="alert">
            {error}
          </div>
        )}
        <Input name="email" label="Email" type="email" isRequired autoComplete="email" />
        <Button type="submit" fullWidth loading={isLoading}>
          Send reset code
        </Button>
      </form>
    </FormProvider>
  );
}

function PasswordStep({ onSuccess }: { onSuccess: () => void }) {
  const { isLoading, error, setLoading, setError } = useFormState();

  const methods = useForm<PasswordFormData>({
    resolver: yupResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  const handleSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    try {
      await resetPassword({ newPassword: data.password, confirmNewPassword: data.confirmPassword });
      setError(null);
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <h1>Set a new password</h1>
      <p>Choose a strong password for your account.</p>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
        {error && (
          <div className="errorMessage" role="alert">
            {error}
          </div>
        )}
        <Input
          name="password"
          label="New Password"
          type="password"
          isRequired
          showPasswordStrength
          autoComplete="new-password"
        />
        <Input
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          isRequired
          autoComplete="new-password"
        />
        <Button type="submit" fullWidth loading={isLoading}>
          Update password
        </Button>
      </form>
    </FormProvider>
  );
}

export default function ResetPassword() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const { showToast } = useToast();
  const router = useRouter();

  return (
    <div className={styles.container}>
      <section className={styles.form}>
        {step === 'email' && (
          <EmailStep
            onSuccess={(submittedEmail) => {
              setEmail(submittedEmail);
              setStep('otp');
            }}
          />
        )}
        {step === 'otp' && (
          <>
            <h1>Check your email</h1>
            <OtpInput
              email={email}
              type="recovery"
              onSuccess={() => setStep('password')}
              onResend={async () => {
                await sendResetCode({ email });
              }}
            />
          </>
        )}
        {step === 'password' && (
          <PasswordStep
            onSuccess={() => {
              showToast({
                type: 'success',
                message: 'Password updated!',
                description: 'You are now logged in.',
              });
              router.push('/');
            }}
          />
        )}
      </section>
    </div>
  );
}
