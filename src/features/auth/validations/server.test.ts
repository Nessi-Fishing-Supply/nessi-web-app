// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validateRegisterInput } from './server';

describe('validateRegisterInput', () => {
  const validInput = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'Str0ngP@ss',
    terms: true,
  };

  it('returns null for valid input', () => {
    expect(validateRegisterInput(validInput)).toBeNull();
  });

  it('rejects missing firstName', () => {
    expect(validateRegisterInput({ ...validInput, firstName: '' })).toBe('First name is required');
  });

  it('rejects missing lastName', () => {
    expect(validateRegisterInput({ ...validInput, lastName: '' })).toBe('Last name is required');
  });

  it('rejects invalid email format', () => {
    expect(validateRegisterInput({ ...validInput, email: 'notanemail' })).toBe(
      'Invalid email format',
    );
  });

  it('rejects empty email', () => {
    expect(validateRegisterInput({ ...validInput, email: '' })).toBe('Email is required');
  });

  it('rejects password shorter than 8 characters', () => {
    expect(validateRegisterInput({ ...validInput, password: 'Sh0rt!' })).toBe(
      'Password must be at least 8 characters',
    );
  });

  it('rejects password without uppercase letter', () => {
    expect(validateRegisterInput({ ...validInput, password: 'alllower1!' })).toBe(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    );
  });

  it('rejects password without lowercase letter', () => {
    expect(validateRegisterInput({ ...validInput, password: 'ALLUPPER1!' })).toBe(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    );
  });

  it('rejects password without number', () => {
    expect(validateRegisterInput({ ...validInput, password: 'NoNumbers!' })).toBe(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    );
  });

  it('rejects when terms not accepted', () => {
    expect(validateRegisterInput({ ...validInput, terms: false })).toBe('Terms must be accepted');
  });

  it('handles null/undefined fields gracefully', () => {
    expect(validateRegisterInput({} as any)).toBe('First name is required');
  });
});
