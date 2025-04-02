'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Input from '@components/controls/input';
import Button from '@components/controls/button';
import Checkbox from '@components/controls/checkbox';
// import GoogleIcon from '@icons/google.svg';
// import FacebookIcon from '@icons/facebook.svg';
// import Divider from '@components/layout/divider';
import AppLink from '@components/controls/app-link';
import { login } from '@services/auth';
import { useAuth } from '@context/auth';
import { useRouter } from 'next/navigation';

interface LoginFormData {
  email: string;
  password: string;
  stayLoggedIn?: boolean;
}

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void;
  onForgotPasswordClick: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, onForgotPasswordClick }) => {
  const { setAuthenticated, setToken, setUser } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const loginSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
    password: Yup.string().required('Password is required'),
  });

  const methods = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: 'onBlur',
  });

  const handleSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { accessToken, refreshToken, expiresIn, user } = await login({
        email: data.email,
        password: data.password,
        rememberMe: data.stayLoggedIn,
      });

      setAuthenticated(true);
      setToken(accessToken);
      setUser(user);

      if (data.stayLoggedIn) {
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('tokenExpiry', (Date.now() + expiresIn * 1000).toString());
      }

      setErrorMessage(null);
      router.push('/dashboard');
      await onSubmit(data);
    } catch (error: unknown) {
      const err = error as { message?: string };
      setErrorMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
        {errorMessage && <div className="errorMessage">{errorMessage}</div>}
        <Input name="email" label="Email" type="email" isRequired />
        <Input name="password" label="Password" type="password" isRequired />
        <Checkbox label="Stay logged in" {...methods.register('stayLoggedIn')} />
        <Button type="submit" fullWidth marginBottom loading={isLoading}>
          Submit
        </Button>
        <AppLink fullWidth center underline size="sm" href="/auth/forgot-password" onClick={onForgotPasswordClick}>
          Forgot your password?
        </AppLink>
        {/* <Divider text="OR" />
        <Button
          style="dark"
          outline
          fullWidth
          round
          marginBottom
          icon={<GoogleIcon />}
          iconPosition="left"
        >
          Continue with Google
        </Button>
        <Button
          style="dark"
          outline
          fullWidth
          round
          icon={<FacebookIcon />}
          iconPosition="left"
        >
          Continue with Facebook
        </Button> */}
      </form>
    </FormProvider>
  );
};

export default LoginForm;