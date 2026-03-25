/**
 * Maximum number of shops a member can belong to (owned + member-of combined).
 * Enforced at the application layer in POST /api/shops and invite acceptance.
 */
export const MAX_SHOPS_PER_MEMBER = 5;
