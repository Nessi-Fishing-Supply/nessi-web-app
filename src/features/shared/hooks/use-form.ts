import { useForm as useHookForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useFormState } from './use-form-state';
import type { ObjectSchema } from 'yup';

// Hook for combining form validation and state management
export const useForm = <T extends Record<string, any>>(schema: ObjectSchema<any>) => {
  const formState = useFormState();

  const methods = useHookForm<T>({
    resolver: yupResolver(schema),
    mode: 'onBlur',
  });

  return {
    ...methods,
    ...formState,
  };
};
