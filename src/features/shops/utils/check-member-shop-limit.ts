import { createAdminClient } from '@/libs/supabase/admin';
import { MAX_SHOPS_PER_MEMBER } from '@/features/shops/constants/limits';

export interface MemberShopLimitResult {
  withinLimit: boolean;
  currentCount: number;
  maxCount: number;
}

/**
 * Check whether a member is within the shop membership limit.
 * Counts all shop_members rows for the given member (owned + member-of).
 * Uses admin client with head-only count for efficiency.
 */
export async function checkMemberShopLimit(memberId: string): Promise<MemberShopLimitResult> {
  const admin = createAdminClient();

  const { count, error } = await admin
    .from('shop_members')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId);

  if (error) {
    throw new Error(`Failed to check shop membership count: ${error.message}`);
  }

  const currentCount = count ?? 0;

  return {
    withinLimit: currentCount < MAX_SHOPS_PER_MEMBER,
    currentCount,
    maxCount: MAX_SHOPS_PER_MEMBER,
  };
}
