/**
 * Deterministic UUIDs for system roles in the shop_roles table.
 * These match the seeded values in migration 20260324100000.
 */
export const SYSTEM_ROLE_IDS = {
  OWNER: '11111111-1111-1111-1111-111111111101',
  MANAGER: '11111111-1111-1111-1111-111111111102',
  CONTRIBUTOR: '11111111-1111-1111-1111-111111111103',
} as const;

export const SYSTEM_ROLE_SLUGS = {
  owner: 'owner',
  manager: 'manager',
  contributor: 'contributor',
} as const;

/**
 * Default role ID for new shop members when no specific role is assigned.
 * Falls back to Contributor (least-privileged system role).
 */
export const DEFAULT_ROLE_ID = SYSTEM_ROLE_IDS.CONTRIBUTOR;
