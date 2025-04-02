import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Input from '@components/controls/input';
import Button from '@components/controls/button';
import { forgotPassword } from '@services/auth';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPasswordForm: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const schema = Yup.object().shape({
    email: Yup.string().email('Invalid email').required('Email is required'),
  });

  const methods = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(schema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await forgotPassword(data);
      setMessage(response.message);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
        <Input name="email" label="Email" type="email" placeholder="Enter your email" isRequired />
        <Button type="submit" fullWidth loading={isLoading}>
          Send Reset Link
        </Button>
        {message && <p className="successMessage">{message}</p>}
        {error && <p className="errorMessage">{error}</p>}
      </form>
    </FormProvider>
  );
};

export default ForgotPasswordForm;
