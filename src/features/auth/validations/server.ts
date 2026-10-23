interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  terms: boolean;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export function validateRegisterInput(input: RegisterInput): string | null {
  if (!input.firstName?.trim()) return 'First name is required';
  if (!input.lastName?.trim()) return 'Last name is required';
  if (!input.email?.trim()) return 'Email is required';
  if (!EMAIL_REGEX.test(input.email)) return 'Invalid email format';
  if (!input.password || input.password.length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 8 characters';
  }
  if (
    !/[A-Z]/.test(input.password) ||
    !/[a-z]/.test(input.password) ||
    !/\d/.test(input.password)
  ) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  if (!input.terms) return 'Terms must be accepted';
  return null;
}
