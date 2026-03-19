'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { resetPasswordSchema } from '@/features/auth/validations/auth';
import { Input, Button } from '@/components/controls';
import { resetPassword } from '@/features/auth/services/auth';
import { AuthFormProps } from '@/features/auth/types/forms';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

/**
 * Reset password form component
 * Handles password update after reset request
 * Validates password requirements and confirmation
 * Redirects to login on success
 */
const ResetPasswordForm: React.FC<AuthFormProps<ResetPasswordFormData>> = ({
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const methods = useForm<ResetPasswordFormData>({
    resolver: yupResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await resetPassword({
        newPassword: data.password,
        confirmNewPassword: data.confirmPassword,
      });
      window.location.href = '/dashboard?password_reset=true';
      if (onSuccess) onSuccess(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Reset failed');
      if (onError) onError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
        <Input
          name="password"
          label="New Password"
          type="password"
          isRequired
          showPasswordStrength
        />
        <Input name="confirmPassword" label="Confirm Password" type="password" isRequired />
        {errorMsg && <p className="errorMessage">{errorMsg}</p>}
        <Button type="submit" fullWidth loading={isLoading}>
          Update Password
        </Button>
      </form>
    </FormProvider>
  );
};

export default ResetPasswordForm;
