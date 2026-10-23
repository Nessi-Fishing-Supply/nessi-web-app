/**
 * Maximum number of shops a member can belong to (owned + member-of combined).
 * Enforced at the application layer in POST /api/shops and invite acceptance.
 */
export const MAX_SHOPS_PER_MEMBER = 5;

/**
 * Maximum combined count of shop_members rows plus pending shop_invites rows for a single shop.
 * Enforced at the application layer in invite creation and invite acceptance.
 */
export const MAX_MEMBERS_PER_SHOP = 5;
