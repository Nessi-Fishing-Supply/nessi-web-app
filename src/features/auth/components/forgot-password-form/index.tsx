import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { useFormState } from '@/features/shared/hooks/use-form-state';
import { Input, Button } from '@/components/controls';
import { sendResetCode } from '@/features/auth/services/auth';
import {
  AuthFormProps,
  ForgotPasswordFormData,
  AuthFormResponse,
} from '@/features/auth/types/forms';

/**
 * Forgot password form component
 * Handles password reset request via email
 * Validates email and provides feedback
 * Manages loading and error states
 */
const ForgotPasswordForm: React.FC<AuthFormProps<ForgotPasswordFormData, AuthFormResponse>> = ({
  onSuccess,
  onError,
}) => {
  const { isLoading, error, success, setLoading, setError, setSuccess } = useFormState();

  const schema = Yup.object().shape({
    email: Yup.string().email('Invalid email').required('Email is required'),
  });

  const methods = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(schema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const response = await sendResetCode(data);
      setSuccess(response.message);
      if (onSuccess) onSuccess(response);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
        <Input
          name="email"
          label="Email"
          type="email"
          placeholder="Enter your email"
          isRequired
          autoComplete="email"
        />
        <Button type="submit" fullWidth loading={isLoading}>
          Send Reset Link
        </Button>
        {success && (
          <p className="successMessage" role="status" aria-live="polite">
            {success}
          </p>
        )}
        {error && (
          <p className="errorMessage" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
      </form>
    </FormProvider>
  );
};

export default ForgotPasswordForm;
