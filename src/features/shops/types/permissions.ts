import type { Database } from '@/types/database';

export type ShopPermissionFeature =
  | 'listings'
  | 'pricing'
  | 'orders'
  | 'messaging'
  | 'shop_settings'
  | 'members';

export type ShopPermissionLevel = 'full' | 'view' | 'none';

export type ShopPermissions = Record<ShopPermissionFeature, ShopPermissionLevel>;

type ShopRoleRow = Database['public']['Tables']['shop_roles']['Row'];

export type ShopRole = Omit<ShopRoleRow, 'permissions'> & {
  permissions: ShopPermissions;
};
