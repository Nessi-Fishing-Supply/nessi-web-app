import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Input from '@components/controls/Input';
import Checkbox from '@components/controls/Checkbox';
import GoogleIcon from '@icons/google.svg';
import FacebookIcon from '@icons/facebook.svg';
import Button from '@components/controls/Button';
import Grid from '@components/layout/Grid';
import Divider from '@components/layout/Divider';
import { register as registerUser } from '@services/auth';
import { useAuth } from '@context/auth';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  terms: boolean;
}

const RegisterForm: React.FC<{ onSubmit: (data: RegisterFormData) => void }> = ({ onSubmit }) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { setAuthenticated, setToken } = useAuth();

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

  const handleSubmit = async (data: RegisterFormData) => {
    try {
      const response = await registerUser(data);
      console.log('Registration successful:', response);
      setSuccessMessage('Registration successful!');
      setErrorMessage(null);
      setAuthenticated(true);
      setToken(response.loginResponse.AccessToken);
      onSubmit(data);
    } catch (error) {
      console.error('Registration failed:', error);
      setErrorMessage('Registration failed. Please try again.');
      setSuccessMessage(null);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
        {successMessage && <div className="successMessage">{successMessage}</div>}
        {errorMessage && <div className="errorMessage">{errorMessage}</div>}
        <Grid columns={2}>
        <Input name="firstName" label="First Name" type="text" isRequired />
        <Input name="lastName" label="Last Name" type="text" isRequired />
        </Grid>
        <Input name="email" label="Email" type="email" isRequired />
        <Input name="password" label="Password" type="password" showPasswordStrength isRequired />
        {/* TODO: Terms is not setup. We don't have terms and conditions yet */}
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
          icon={<FacebookIcon />}
          iconPosition='left'
          onClick={() => console.log('Facebook SSO')}>
          Continue with Facebook
        </Button>
      </form>
    </FormProvider>
  );
};

export default RegisterForm;