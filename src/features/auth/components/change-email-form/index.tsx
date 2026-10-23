'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { changeEmailSchema } from '@/features/auth/validations/auth';
import { useFormState } from '@/features/shared/hooks/use-form-state';
import { Input, Button } from '@/components/controls';
import {
  changeEmail,
  checkEmailAvailable,
  resendEmailChangeCode,
} from '@/features/auth/services/auth';
import OtpInput from '@/features/auth/components/otp-input';
import styles from './change-email-form.module.scss';

interface ChangeEmailFormProps {
  currentEmail: string;
  onSuccess: () => void;
}

interface ChangeEmailFormData {
  email: string;
}

export default function ChangeEmailForm({ currentEmail, onSuccess }: ChangeEmailFormProps) {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [newEmail, setNewEmail] = useState('');
  const { isLoading, error, setLoading, setError } = useFormState();

  const methods = useForm<ChangeEmailFormData>({
    resolver: yupResolver(changeEmailSchema),
    mode: 'onBlur',
  });

  const handleSubmit = async (data: ChangeEmailFormData) => {
    const trimmedEmail = data.email.trim().toLowerCase();

    if (trimmedEmail === currentEmail.toLowerCase()) {
      setError('That is your current email address');
      return;
    }

    setLoading(true);
    try {
      const { available } = await checkEmailAvailable({ email: trimmedEmail });
      if (!available) {
        setError('An account with that email already exists');
        return;
      }

      await changeEmail({ newEmail: trimmedEmail });
      setNewEmail(trimmedEmail);
      setStep('otp');
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'DUPLICATE_EMAIL') {
          setError('An account with that email already exists');
        } else {
          setError(err.message);
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    onSuccess();
  };

  const handleResend = async () => {
    try {
      await resendEmailChangeCode({ newEmail });
    } catch {
      // OtpInput handles resend cooldown UI; user can retry after cooldown
    }
  };

  if (step === 'otp') {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Verify your new email</h2>
        <p className={styles.description}>We sent a 6-digit code to your new email address.</p>
        <OtpInput
          email={newEmail}
          type="email_change"
          onSuccess={handleOtpSuccess}
          onResend={handleResend}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Change your email</h2>
      <p className={styles.description}>
        Enter your new email address. We&#39;ll send a verification code to confirm it.
      </p>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
          {error && (
            <div role="alert" aria-live="assertive" className="errorMessage">
              {error}
            </div>
          )}

          <Input
            name="email"
            label="New email address"
            type="email"
            isRequired
            autoComplete="email"
          />

          <Button type="submit" fullWidth loading={isLoading} aria-busy={isLoading}>
            Send verification code
          </Button>
        </form>
      </FormProvider>
    </div>
  );
}
