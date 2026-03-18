import { useState } from 'react';
import { FormState } from '@/features/shared/types/forms';

// Hook for managing form state (loading, errors, success messages)
export const useFormState = (initialState?: Partial<FormState>) => {
  const [state, setState] = useState<FormState>({
    isLoading: false,
    error: null,
    success: null,
    ...initialState,
  });

  const setLoading = (isLoading: boolean) => setState((prev) => ({ ...prev, isLoading }));

  const setError = (error: string | null) =>
    setState((prev) => ({ ...prev, error, success: null }));

  const setSuccess = (success: string | null) =>
    setState((prev) => ({ ...prev, success, error: null }));

  const resetState = () => setState({ isLoading: false, error: null, success: null });

  return {
    ...state,
    setLoading,
    setError,
    setSuccess,
    resetState,
  };
};
