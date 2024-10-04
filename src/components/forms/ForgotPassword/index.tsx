import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Input from '@components/controls/Input';
import './AuthForm.scss';

// Define the structure of the form data
interface ForgotPasswordFormData {
  email: string;
}

const ForgotPasswordForm: React.FC<{ onSubmit: (data: ForgotPasswordFormData) => void }> = ({ onSubmit }) => {
  // Scoped validation schema
  const forgotPasswordSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
  });

  const methods = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordSchema),
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
        <Input name="email" label="Email" type="email" placeholder="Enter your email" />
        <button type="submit" className="submitButton">Send Reset Link</button>
      </form>
    </FormProvider>
  );
};

export default ForgotPasswordForm;
