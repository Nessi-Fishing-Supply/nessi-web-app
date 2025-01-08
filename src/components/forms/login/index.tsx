import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Input from '@components/controls/input';
import Button from '@components/controls/button';
import Checkbox from '@components/controls/checkbox';
import GoogleIcon from '@icons/google.svg';
import FacebookIcon from '@icons/facebook.svg';
import Divider from '@components/layout/divider';
import AppLink from '@components/controls/app-link';
import { login, refreshToken } from '@services/auth';
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
  const { setAuthenticated, setToken } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  // Validation schema for the form
  const loginSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
    password: Yup.string().required('Password is required'),
    // stayLoggedIn: Yup.boolean(),
  });

  const methods = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: 'onBlur',
  });

  const handleSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await login({ ...data, rememberMe: data.stayLoggedIn || false });
      const { AccessToken, RefreshToken, expiryTime } = response;
      if (!AccessToken || !RefreshToken) {
        throw new Error('Tokens are missing in the response');
      }
      setAuthenticated(true);
      setToken(AccessToken);
      if (data.stayLoggedIn) {
        localStorage.setItem('authToken', AccessToken);
        localStorage.setItem('refreshToken', RefreshToken);
        localStorage.setItem('tokenExpiry', expiryTime.toString());

        // Set up token refresh logic
        const refreshTokenBeforeExpiry = async () => {
          const currentTime = new Date().getTime();
          const storedExpiryTime = parseInt(localStorage.getItem('tokenExpiry') || '0', 10);
          const timeUntilExpiry = storedExpiryTime - currentTime - 60000; // Refresh 1 minute before expiry

          if (timeUntilExpiry > 0) {
            setTimeout(async () => {
              try {
                const storedRefreshToken = localStorage.getItem('refreshToken');
                if (storedRefreshToken) {
                  const refreshResponse = await refreshToken(storedRefreshToken);
                  const { AccessToken: newAccessToken, ExpiresIn: newExpiresIn } = refreshResponse;
                  const newExpiryTime = new Date().getTime() + newExpiresIn * 1000;
                  setToken(newAccessToken);
                  localStorage.setItem('authToken', newAccessToken);
                  localStorage.setItem('tokenExpiry', newExpiryTime.toString());
                  refreshTokenBeforeExpiry(); // Set up the next refresh
                }
              } catch (refreshError) {
                const error = refreshError as { response?: { data?: { message?: string } } };
                if (error.response) {
                  console.error('Token refresh failed:', error.response.data);
                }
                setAuthenticated(false);
                setToken(null);
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('tokenExpiry');
                router.push('/login');
              }
            }, timeUntilExpiry);
          }
        };

        refreshTokenBeforeExpiry();
      }
      setErrorMessage(null);
      router.push('/dashboard');
      await onSubmit(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Login failed:', err);
      setErrorMessage(err.response?.data?.message || 'Login failed. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
        {errorMessage && <div className="errorMessage">{errorMessage}</div>}
        <Input name="email" label="Email" type="email" isRequired />
        <Input name="password" label="Password" type="password" isRequired />
        <Checkbox label="Stay logged in" {...methods.register('stayLoggedIn')} />
        <Button
          type="submit"
          fullWidth
          marginBottom
          loading={isLoading}>
          Submit
        </Button>
        <AppLink fullWidth center underline size="sm" href="/forgot-password" onClick={onForgotPasswordClick}>
          Forgot your password?
        </AppLink>
        <Divider text="OR" />
        <Button
          style="dark"
          outline
          fullWidth
          round
          marginBottom
          icon={<GoogleIcon />}
          iconPosition='left'>
          Continue with Google
        </Button>
        <Button
          style="dark"
          outline
          fullWidth
          round
          icon={<FacebookIcon />}
          iconPosition='left'>
          Continue with Facebook
        </Button>
      </form>
    </FormProvider>
  );
};

export default LoginForm;