import { useQuery } from '@tanstack/react-query';
import { getShopRoles } from '@/features/shops/services/shop';

export function useShopRoles(shopId: string, enabled = true) {
  return useQuery({
    queryKey: ['shops', shopId, 'roles'],
    queryFn: () => getShopRoles(shopId),
    enabled: !!shopId && enabled,
  });
}
