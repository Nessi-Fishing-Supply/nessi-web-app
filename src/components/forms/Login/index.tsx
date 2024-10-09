import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Input from '@components/controls/Input';
import Button from '@components/controls/Button';
import Checkbox from '@components/controls/Checkbox';
import AppleIcon from '@icons/apple.svg';
import GoogleIcon from '@icons/google.svg';
import FacebookIcon from '@icons/facebook.svg';
import Divider from '@components/Divider';
import AppLink from '@components/controls/AppLink';

interface LoginFormData {
  email: string;
  password: string;
  stayLoggedIn?: boolean;
}

const LoginForm: React.FC<{ onSubmit: (data: LoginFormData) => void }> = ({ onSubmit }) => {
  // Validation schema for the form
  const loginSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
    password: Yup.string().required('Password is required'),
    stayLoggedIn: Yup.boolean(),
  });

  const methods = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
        <Input name="email" label="Email" type="email" isRequired />
        <Input name="password" label="Password" type="password" isRequired />
        <Checkbox label="Stay logged in" {...methods.register('stayLoggedIn')} />
        <Button
          type="submit"
          fullWidth={true}
          marginBottom={true}
          onClick={() => console.log('Submit Form')}>
          Submit
        </Button>
        <AppLink fullWidth center underline size="sm" href="/forgot-password">
          Forgot your password?
        </AppLink>
        <Divider text="OR" />
        <Button
          style="dark"
          outline={true}
          fullWidth={true}
          round={true}
          marginBottom={true}
          icon={<GoogleIcon />}
          iconPosition='left'
          onClick={() => console.log('Google SSO')}>
          Continue with Google
        </Button>
        <Button
          style="dark"
          outline={true}
          fullWidth={true}
          round={true}
          marginBottom={true}
          icon={<FacebookIcon />}
          iconPosition='left'
          onClick={() => console.log('Facebook SSO')}>
          Continue with Facebook
        </Button>
        <Button
          style="dark"
          outline={true}
          fullWidth={true}
          round={true}
          icon={<AppleIcon />}
          iconPosition='left'
          onClick={() => console.log('Apple SSO')}>
          Continue with Apple
        </Button>
      </form>
    </FormProvider>
  );
};

export default LoginForm;