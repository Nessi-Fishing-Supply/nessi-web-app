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

  const isOnShopRoute = matchedRoute !== undefined;

  const isDenied =
    activeContext.type === 'shop' &&
    !isLoading &&
    isOnShopRoute &&
    !meetsLevel(permissions, matchedRoute.feature, matchedRoute.level);

  const isContextMismatch = activeContext.type === 'member' && isOnShopRoute;

  useEffect(() => {
    redirectedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    if (redirectedRef.current) return;
    if (!isDenied && !isContextMismatch) return;

    redirectedRef.current = true;

    showToast({
      message: isContextMismatch ? 'Switched to member' : 'Access denied',
      description: isContextMismatch
        ? 'You left shop context. Redirecting to your dashboard.'
        : "You don't have permission to access this page.",
      type: isContextMismatch ? 'success' : 'error',
    });

    router.push('/dashboard');
  }, [isDenied, isContextMismatch, router, showToast]);

  if (isDenied || isContextMismatch) {
    return null;
  }

  return <>{children}</>;
}
