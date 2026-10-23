import { EMAIL_REGEX } from '@/features/auth/validations/server';
import { SYSTEM_ROLE_IDS } from '@/features/shops/constants/roles';

const VALID_ROLE_IDS = Object.values(SYSTEM_ROLE_IDS);

export function validateInviteInput(input: { email: string; roleId: string }): string | null {
  if (!input.email?.trim()) return 'Email is required';
  if (!EMAIL_REGEX.test(input.email)) return 'Invalid email format';
  if (!input.roleId?.trim()) return 'Role is required';
  if (!VALID_ROLE_IDS.includes(input.roleId as (typeof VALID_ROLE_IDS)[number]))
    return 'Invalid role';
  if (input.roleId === SYSTEM_ROLE_IDS.OWNER) return 'Cannot invite as Owner';
  return null;
}
