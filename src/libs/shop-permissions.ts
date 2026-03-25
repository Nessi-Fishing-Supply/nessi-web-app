import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import type { ShopMemberRow } from '@/features/shops/types/shop';
import type {
  ShopPermissionFeature,
  ShopPermissionLevel,
  ShopPermissions,
  ShopRole,
} from '@/features/shops/types/permissions';

export type ShopPermissionResult = {
  user: User;
  shopId: string;
  member: ShopMemberRow & { shop_roles: ShopRole };
};

const PERMISSION_LEVELS: Record<ShopPermissionLevel, number> = {
  none: 0,
  view: 1,
  full: 2,
};

export async function getShopMemberWithRole(
  userId: string,
  shopId: string,
): Promise<(ShopMemberRow & { shop_roles: ShopRole }) | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('shop_members')
    .select('*, shop_roles(*)')
    .eq('member_id', userId)
    .eq('shop_id', shopId)
    .single();

  if (error || !data || !data.shop_roles) {
    return null;
  }

  const rawRole = data.shop_roles as Omit<typeof data.shop_roles, 'permissions'> & {
    permissions: unknown;
  };

  const member = {
    ...data,
    shop_roles: {
      ...rawRole,
      permissions: rawRole.permissions as ShopPermissions,
    } as ShopRole,
  };

  return member;
}

export async function requireShopPermission(
  request: Request,
  feature: ShopPermissionFeature,
  level: ShopPermissionLevel,
): Promise<NextResponse | ShopPermissionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: AUTH_CACHE_HEADERS },
    );
  }

  const contextHeader = request.headers.get('X-Nessi-Context');
  if (!contextHeader || !contextHeader.startsWith('shop:')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_CACHE_HEADERS });
  }

  const shopId = contextHeader.slice('shop:'.length);
  if (!shopId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_CACHE_HEADERS });
  }

  const member = await getShopMemberWithRole(user.id, shopId);
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_CACHE_HEADERS });
  }

  if (member.shop_roles.is_system === true && member.shop_roles.slug === 'owner') {
    return { user, shopId, member };
  }

  const userLevel = member.shop_roles.permissions[feature] ?? 'none';
  if (PERMISSION_LEVELS[userLevel] < PERMISSION_LEVELS[level]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_CACHE_HEADERS });
  }

  return { user, shopId, member };
}
