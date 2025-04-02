'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import Input from '@components/controls/input';
import Button from '@components/controls/button';
import { resetPassword } from '@services/auth';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPasswordForm: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const schema = Yup.object().shape({
    password: Yup.string().min(8, 'Minimum 8 characters').required(),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required(),
  });

  const methods = useForm<ResetPasswordFormData>({
    resolver: yupResolver(schema),
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
      router.push('/?login=true');
    } catch (err: any) {
      setErrorMsg(err.message || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
        <Input name="password" label="New Password" type="password" isRequired showPasswordStrength />
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
