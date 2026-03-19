import { describe, it, expect } from 'vitest';
import { checkOnboardingComplete } from '../onboarding';

describe('checkOnboardingComplete', () => {
  it('returns { isComplete: true }', async () => {
    const result = await checkOnboardingComplete();
    expect(result).toEqual({ isComplete: true });
  });

  it('returns a Promise (is async)', () => {
    const result = checkOnboardingComplete();
    expect(result).toBeInstanceOf(Promise);
  });
});
