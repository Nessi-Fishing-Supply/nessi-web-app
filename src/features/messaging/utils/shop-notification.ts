import { createAdminClient } from '@/libs/supabase/admin';
import type {
  ShopPermissionFeature,
  ShopPermissionLevel,
  ShopPermissions,
} from '@/features/shops/types/permissions';
import { meetsLevel } from '@/features/shops/utils/check-permission';

export async function getShopMembersWithPermission(
  shopId: string,
  feature: ShopPermissionFeature,
  level: ShopPermissionLevel,
): Promise<{ member_id: string }[]> {
  const supabase = createAdminClient();

  const { data: members, error } = await supabase
    .from('shop_members')
    .select('member_id, shop_roles(permissions)')
    .eq('shop_id', shopId);

  if (error || !members) return [];

  return members.filter((m) => {
    const role = m.shop_roles as { permissions: ShopPermissions } | null;
    if (!role?.permissions) return false;
    return meetsLevel(role.permissions, feature, level);
  });
}
