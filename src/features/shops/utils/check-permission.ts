import type {
  ShopPermissionFeature,
  ShopPermissionLevel,
  ShopPermissions,
} from '@/features/shops/types/permissions';

/**
 * Look up the permission level for a specific feature.
 * Returns 'none' if the feature key is missing from the permissions object.
 */
export function checkPermission(
  permissions: Partial<ShopPermissions>,
  feature: ShopPermissionFeature,
): ShopPermissionLevel {
  return permissions[feature] ?? 'none';
}

/**
 * Check if the user has any access (full or view) to a feature.
 */
export function hasAccess(
  permissions: Partial<ShopPermissions>,
  feature: ShopPermissionFeature,
): boolean {
  const level = checkPermission(permissions, feature);
  return level === 'full' || level === 'view';
}

/**
 * Check if the user has full access to a feature.
 */
export function hasFullAccess(
  permissions: Partial<ShopPermissions>,
  feature: ShopPermissionFeature,
): boolean {
  return checkPermission(permissions, feature) === 'full';
}
