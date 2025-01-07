import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { useSearchParams, useRouter } from 'next/navigation'; // Updated import
import { resetPassword } from '@services/auth';
import Input from '@components/controls/input-temp';
import Button from '@components/controls/button';

// Define the structure of the form data
interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPasswordForm: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter(); // Added useRouter hook
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const token = searchParams ? searchParams.get('token') : null;

  // Scoped validation schema
  const resetPasswordSchema = Yup.object().shape({
    password: Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Confirm Password is required'),
  });

  const methods = useForm<ResetPasswordFormData>({
    resolver: yupResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (token) {
      setIsLoading(true);
      try {
        const response = await resetPassword({
          token,
          newPassword: data.password,
          confirmNewPassword: data.confirmPassword,
        });
        console.log('Password reset successful:', response);
        router.push('/?login=true');
      } catch (error) {
        console.error('Error resetting password:', error);
      }
      setIsLoading(false);
    } else {
      console.error('No token found in URL');
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
        <Input name="password" label="New Password" type="password" placeholder="Enter your new password" showPasswordStrength isRequired />
        <Input name="confirmPassword" label="Confirm New Password" type="password" placeholder="Confirm your new password" isRequired />
        <Button
          type="submit"
          fullWidth={true}
          loading={isLoading}>
          Update Password
        </Button>
      </form>
    </FormProvider>
  );
};

export default ResetPasswordForm;
