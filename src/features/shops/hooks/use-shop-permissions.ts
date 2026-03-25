import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyShopRole } from '@/features/shops/services/shop';
import type { ShopPermissions } from '@/features/shops/types/permissions';

const DEFAULT_PERMISSIONS: ShopPermissions = {
  listings: 'none',
  pricing: 'none',
  orders: 'none',
  messaging: 'none',
  shop_settings: 'none',
  members: 'none',
};

export function useShopPermissions(shopId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['shops', shopId, 'my-permissions'],
    queryFn: () => getMyShopRole(shopId),
    enabled: !!shopId,
  });

  const permissions = useMemo<ShopPermissions>(() => {
    if (!data?.shop_roles?.permissions) return DEFAULT_PERMISSIONS;
    return data.shop_roles.permissions as ShopPermissions;
  }, [data]);

  const role = useMemo<string | null>(() => {
    return data?.shop_roles?.slug ?? null;
  }, [data]);

  return { permissions, role, isLoading };
}
