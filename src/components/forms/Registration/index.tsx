import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Input from '@components/controls/Input';
import Checkbox from '@components/controls/Checkbox';
import AppleIcon from '@icons/apple.svg';
import GoogleIcon from '@icons/google.svg';
import FacebookIcon from '@icons/facebook.svg';
import Button from '@components/controls/Button';
import Grid from '@components/Grid';
import Divider from '@components/Divider';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  terms: boolean;
}

const RegisterForm: React.FC<{ onSubmit: (data: RegisterFormData) => void }> = ({ onSubmit }) => {
  const registrationSchema = Yup.object().shape({
    firstName: Yup.string().required('First Name is required'),
    lastName: Yup.string().required('Last Name is required'),
    email: Yup.string().email('Invalid email address').required('Email is required'),
    password: Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
    terms: Yup.bool().oneOf([true], 'You must accept the terms and conditions').required(),
  });

  const methods = useForm<RegisterFormData>({
    resolver: yupResolver(registrationSchema),
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
        <Grid columns={2}>
        <Input name="firstName" label="First Name" type="text" isRequired />
        <Input name="lastName" label="Last Name" type="text" isRequired />
        </Grid>
        <Input name="email" label="Email" type="email" isRequired />
        <Input name="password" label="Password" type="password" showPasswordStrength isRequired />
        <Checkbox name="terms" label="I accept the terms and conditions" isRequired />
        <Button
          type="submit"
          fullWidth
          onClick={() => console.log('Submit Form')}>
          Sign Up
        </Button>
        <Divider text="OR" />
        <Button
          style="dark"
          outline
          fullWidth
          round
          marginBottom
          icon={<GoogleIcon />}
          iconPosition='left'
          onClick={() => console.log('Google SSO')}>
          Continue with Google
        </Button>
        <Button
          style="dark"
          outline
          fullWidth
          round
          marginBottom
          icon={<FacebookIcon />}
          iconPosition='left'
          onClick={() => console.log('Facebook SSO')}>
          Continue with Facebook
        </Button>
        <Button
          style="dark"
          outline
          fullWidth
          round
          icon={<AppleIcon />}
          iconPosition='left'
          onClick={() => console.log('Apple SSO')}>
          Continue with Apple
        </Button>
      </form>
    </FormProvider>
  );
};

export default RegisterForm;