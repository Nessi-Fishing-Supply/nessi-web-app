import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkOnboardingComplete } from '../onboarding';

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockGetUser = vi.fn();

vi.mock('@/libs/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

describe('checkOnboardingComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { isComplete: true } when onboarding is completed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({
      data: { onboarding_completed_at: '2026-03-19T00:00:00Z' },
    });

    const result = await checkOnboardingComplete();
    expect(result).toEqual({ isComplete: true });
    expect(mockFrom).toHaveBeenCalledWith('members');
    expect(mockSelect).toHaveBeenCalledWith('onboarding_completed_at');
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('returns { isComplete: false } when onboarding is not completed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: { onboarding_completed_at: null } });

    const result = await checkOnboardingComplete();
    expect(result).toEqual({ isComplete: false });
  });

  it('returns { isComplete: false } when no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await checkOnboardingComplete();
    expect(result).toEqual({ isComplete: false });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns { isComplete: false } when no profile row found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: null });

    const result = await checkOnboardingComplete();
    expect(result).toEqual({ isComplete: false });
  });

  it('returns a Promise (is async)', () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = checkOnboardingComplete();
    expect(result).toBeInstanceOf(Promise);
  });
});
