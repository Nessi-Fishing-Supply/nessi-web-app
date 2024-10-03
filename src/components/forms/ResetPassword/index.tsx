import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Input from '@components/controls/Input';

const ResetPasswordForm: React.FC<{ onSubmit: (data: any) => void }> = ({ onSubmit }) => {
  // Scoped validation schema
  const resetPasswordSchema = Yup.object().shape({
    password: Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Confirm Password is required'),
  });

  const methods = useForm({
    resolver: yupResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
        <Input name="password" label="New Password" type="password" placeholder="Enter your new password" />
        <Input name="confirmPassword" label="Confirm New Password" type="password" placeholder="Confirm your new password" />
        <button type="submit" className="submitButton">Reset Password</button>
      </form>
    </FormProvider>
  );
};

export default ResetPasswordForm;
