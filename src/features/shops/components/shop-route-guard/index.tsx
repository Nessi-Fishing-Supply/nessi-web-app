'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useContextStore from '@/features/context/stores/context-store';
import { useShopPermissions } from '@/features/shops/hooks/use-shop-permissions';
import { meetsLevel } from '@/features/shops/utils/check-permission';
import { useToast } from '@/components/indicators/toast/context';
import type {
  ShopPermissionFeature,
  ShopPermissionLevel,
} from '@/features/shops/types/permissions';

const GUARDED_ROUTES: {
  pathPrefix: string;
  feature: ShopPermissionFeature;
  level: ShopPermissionLevel;
}[] = [
  { pathPrefix: '/dashboard/shop/settings', feature: 'shop_settings', level: 'view' },
  { pathPrefix: '/dashboard/shop/roles', feature: 'members', level: 'view' },
  { pathPrefix: '/dashboard/listings', feature: 'listings', level: 'view' },
];

interface ShopRouteGuardProps {
  children: ReactNode;
}

export default function ShopRouteGuard({ children }: ShopRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const activeContext = useContextStore.use.activeContext();
  const redirectedRef = useRef(false);

  const shopId = activeContext.type === 'shop' ? activeContext.shopId : '';
  const { permissions, isLoading } = useShopPermissions(shopId);

  const matchedRoute = GUARDED_ROUTES.find((route) => pathname.startsWith(route.pathPrefix));

  const isDenied =
    activeContext.type === 'shop' &&
    !isLoading &&
    matchedRoute !== undefined &&
    !meetsLevel(permissions, matchedRoute.feature, matchedRoute.level);

  useEffect(() => {
    redirectedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!isDenied || redirectedRef.current) return;

    redirectedRef.current = true;

    showToast({
      message: 'Access denied',
      description: "You don't have permission to access this page.",
      type: 'error',
    });

    router.push('/dashboard');
  }, [isDenied, router, showToast]);

  if (isDenied) {
    return null;
  }

  return <>{children}</>;
}
