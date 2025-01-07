import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Input from '@components/controls/input-temp';
import Button from '@components/controls/button';
import { forgotPassword } from '@services/auth';

// Define the structure of the form data
interface ForgotPasswordFormData {
  email: string;
}

const ForgotPasswordForm: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Scoped validation schema
  const forgotPasswordSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
  });

  const methods = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    const response = await forgotPassword(data);
    setMessage(response.message);
    setIsLoading(false);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
        <Input name="email" label="Email" type="email" placeholder="Enter your email" isRequired />
        <Button
          type="submit"
          fullWidth={true}
          loading={isLoading}>
          Send Reset Link
        </Button>
        {message && <p>{message}</p>}
      </form>
    </FormProvider>
  );
};

export default ForgotPasswordForm;
