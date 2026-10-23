// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, resetPasswordSchema, changeEmailSchema } from './auth';

describe('loginSchema', () => {
  it('validates correct input', async () => {
    await expect(loginSchema.validate({ email: 'a@b.com', password: 'x' })).resolves.toBeDefined();
  });

  it('rejects invalid email', async () => {
    await expect(loginSchema.validate({ email: 'bad', password: 'x' })).rejects.toThrow();
  });

  it('rejects missing password', async () => {
    await expect(loginSchema.validate({ email: 'a@b.com', password: '' })).rejects.toThrow();
  });
});

describe('registerSchema', () => {
  const valid = {
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.com',
    password: 'Str0ngP@ss',
    terms: true,
  };

  it('validates correct input', async () => {
    await expect(registerSchema.validate(valid)).resolves.toBeDefined();
  });

  it('rejects short password', async () => {
    await expect(registerSchema.validate({ ...valid, password: 'Sh0rt' })).rejects.toThrow(
      'at least 8',
    );
  });

  it('rejects password without uppercase', async () => {
    await expect(registerSchema.validate({ ...valid, password: 'alllower1' })).rejects.toThrow(
      'uppercase',
    );
  });

  it('rejects password without lowercase', async () => {
    await expect(registerSchema.validate({ ...valid, password: 'ALLUPPER1' })).rejects.toThrow(
      'lowercase',
    );
  });

  it('rejects password without number', async () => {
    await expect(registerSchema.validate({ ...valid, password: 'NoNumbersHere' })).rejects.toThrow(
      'number',
    );
  });

  it('rejects unaccepted terms', async () => {
    await expect(registerSchema.validate({ ...valid, terms: false })).rejects.toThrow();
  });
});

describe('resetPasswordSchema', () => {
  it('validates matching complex passwords', async () => {
    await expect(
      resetPasswordSchema.validate({ password: 'NewP@ss1', confirmPassword: 'NewP@ss1' }),
    ).resolves.toBeDefined();
  });

  it('rejects mismatched passwords', async () => {
    await expect(
      resetPasswordSchema.validate({ password: 'NewP@ss1', confirmPassword: 'Different1' }),
    ).rejects.toThrow('match');
  });

  it('rejects weak reset password', async () => {
    await expect(
      resetPasswordSchema.validate({ password: 'weak', confirmPassword: 'weak' }),
    ).rejects.toThrow();
  });
});

describe('changeEmailSchema', () => {
  it('validates correct email input', async () => {
    await expect(changeEmailSchema.validate({ email: 'new@example.com' })).resolves.toBeDefined();
  });

  it('rejects invalid email format', async () => {
    await expect(changeEmailSchema.validate({ email: 'not-an-email' })).rejects.toThrow(
      'Invalid email',
    );
  });

  it('rejects missing email', async () => {
    await expect(changeEmailSchema.validate({ email: '' })).rejects.toThrow();
  });
});
