import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useFormState } from './use-form-state';

describe('useFormState', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useFormState());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
  });

  it('sets loading state', () => {
    const { result } = renderHook(() => useFormState());

    act(() => result.current.setLoading(true));
    expect(result.current.isLoading).toBe(true);

    act(() => result.current.setLoading(false));
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error and clears success', () => {
    const { result } = renderHook(() => useFormState());

    act(() => result.current.setSuccess('done'));
    act(() => result.current.setError('something went wrong'));

    expect(result.current.error).toBe('something went wrong');
    expect(result.current.success).toBeNull();
  });

  it('sets success and clears error', () => {
    const { result } = renderHook(() => useFormState());

    act(() => result.current.setError('oops'));
    act(() => result.current.setSuccess('all good'));

    expect(result.current.success).toBe('all good');
    expect(result.current.error).toBeNull();
  });

  it('resets state', () => {
    const { result } = renderHook(() => useFormState());

    act(() => {
      result.current.setLoading(true);
      result.current.setError('err');
    });

    act(() => result.current.resetState());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
  });
});
