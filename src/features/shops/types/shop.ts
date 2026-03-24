import type { Database } from '@/types/database';

export type Shop = Database['public']['Tables']['shops']['Row'];

export type ShopInsert = Omit<
  Database['public']['Tables']['shops']['Insert'],
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
  | 'stripe_account_id'
  | 'is_stripe_connected'
  | 'stripe_onboarding_status'
  | 'stripe_subscription_id'
  | 'subscription_status'
  | 'subscription_tier'
  | 'average_rating'
  | 'review_count'
  | 'total_transactions'
  | 'is_verified'
>;

export type ShopUpdate = Omit<
  Database['public']['Tables']['shops']['Update'],
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
  | 'stripe_account_id'
  | 'is_stripe_connected'
  | 'stripe_onboarding_status'
  | 'stripe_subscription_id'
  | 'subscription_status'
  | 'subscription_tier'
  | 'average_rating'
  | 'review_count'
  | 'total_transactions'
  | 'is_verified'
>;

export type ShopMemberRow = Database['public']['Tables']['shop_members']['Row'];

export type ShopMember = ShopMemberRow & {
  members: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type ShopMemberInsert = Omit<
  Database['public']['Tables']['shop_members']['Insert'],
  'id' | 'created_at'
>;

export type ShopMemberRole = 'owner' | 'manager' | 'staff';

/**
 * Deterministic UUIDs for system roles in the shop_roles table.
 * These match the seeded values in migration 20260324100000.
 */
export const SYSTEM_ROLE_IDS = {
  OWNER: '11111111-1111-1111-1111-111111111101',
  MANAGER: '11111111-1111-1111-1111-111111111102',
  CONTRIBUTOR: '11111111-1111-1111-1111-111111111103',
} as const;
