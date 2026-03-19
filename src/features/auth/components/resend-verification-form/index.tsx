'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { Input, Button } from '@/components/controls';
import { resendVerification } from '@/features/auth/services/auth';
import { useFormState } from '@/features/shared/hooks/use-form-state';
import { HiOutlineExclamation, HiCheck } from 'react-icons/hi';
import styles from './resend-verification-form.module.scss';

interface ResendVerificationFormProps {
  onBackToLogin?: () => void;
}

const schema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
});

const ResendVerificationForm: React.FC<ResendVerificationFormProps> = ({ onBackToLogin }) => {
  const { isLoading, error, setLoading, setError } = useFormState();
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  const methods = useForm<{ email: string }>({
    resolver: yupResolver(schema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: { email: string }) => {
    setLoading(true);
    setError(null);
    try {
      await resendVerification({ email: data.email });
      setSentToEmail(data.email);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sentToEmail) {
    return (
      <div>
        <div className={styles.successCard}>
          <div className={`${styles.iconCircle} ${styles.successIcon}`}>
            <HiCheck />
          </div>
          <p className={styles.successTitle}>Verification email sent!</p>
          <p className={styles.successDescription}>
            Check your inbox at <strong>{sentToEmail}</strong>
          </p>
          <p className={styles.successSubtitle}>
            Click the link in the email, then come back and sign in.
          </p>
        </div>
        {onBackToLogin && (
          <div className={styles.backLink}>
            <button onClick={onBackToLogin} className="link">
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <div className={`${styles.iconCircle} ${styles.warningIcon}`}>
          <HiOutlineExclamation />
        </div>
        <h6 className={styles.title}>Verification link expired</h6>
        <p className={styles.subtitle}>Enter your email to resend the verification link.</p>
      </div>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
          <Input name="email" label="Email" type="email" isRequired />
          {error && <p className="errorMessage">{error}</p>}
          <Button type="submit" fullWidth loading={isLoading}>
            Resend Verification Email
          </Button>
        </form>
      </FormProvider>
      {onBackToLogin && (
        <div className={styles.backLink}>
          <button onClick={onBackToLogin} className="link">
            Back to Sign In
          </button>
        </div>
      )}
    </div>
  );
};

export default ResendVerificationForm;
