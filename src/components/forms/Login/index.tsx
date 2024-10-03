import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Input from '@components/controls/Input';

const LoginForm: React.FC<{ onSubmit: (data: any) => void }> = ({ onSubmit }) => {
  // Scoped validation schema
  const loginSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
    password: Yup.string().required('Password is required'),
  });

  const methods = useForm({
    resolver: yupResolver(loginSchema),
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
        <Input name="email" label="Email" type="email" placeholder="Enter your email" />
        <Input name="password" label="Password" type="password" placeholder="Enter your password" />
        <button type="submit" className="submitButton">Login</button>
      </form>
    </FormProvider>
  );
};

export default LoginForm;
