import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Input from '@components/controls/Input';
import Checkbox from '@components/controls/Checkbox';
import './AuthForm.scss';

// Define the structure of the form data
interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

const RegisterForm: React.FC<{ onSubmit: (data: RegisterFormData) => void }> = ({ onSubmit }) => {
  // Scoped validation schema
  const registrationSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
    password: Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Confirm Password is required'),
    terms: Yup.bool().oneOf([true], 'You must accept the terms and conditions').required(),
  });

  const methods = useForm<RegisterFormData>({
    resolver: yupResolver(registrationSchema),
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
        <Input name="email" label="Email" type="email" placeholder="Enter your email" />
        <Input name="password" label="Password" type="password" placeholder="Enter your password" />
        <Input name="confirmPassword" label="Confirm Password" type="password" placeholder="Confirm your password" />
        <Checkbox name="terms" label="I accept the terms and conditions" />
        <button type="submit" className="submitButton">Register</button>
      </form>
    </FormProvider>
  );
};

export default RegisterForm;
