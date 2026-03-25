import { describe, it, expect } from 'vitest';
import { checkPermission, hasAccess, hasFullAccess, meetsLevel } from '../check-permission';
import type { ShopPermissions } from '@/features/shops/types/permissions';

const fullPermissions: ShopPermissions = {
  listings: 'full',
  pricing: 'full',
  orders: 'full',
  messaging: 'full',
  shop_settings: 'full',
  members: 'full',
};

describe('checkPermission', () => {
  it('returns "full" when feature is set to full', () => {
    expect(checkPermission(fullPermissions, 'listings')).toBe('full');
  });

  it('returns "view" when feature is set to view', () => {
    const permissions: Partial<ShopPermissions> = { listings: 'view' };
    expect(checkPermission(permissions, 'listings')).toBe('view');
  });

  it('returns "none" when feature is set to none', () => {
    const permissions: Partial<ShopPermissions> = { listings: 'none' };
    expect(checkPermission(permissions, 'listings')).toBe('none');
  });

  it('returns "none" for a missing key', () => {
    const permissions: Partial<ShopPermissions> = { listings: 'full' };
    expect(checkPermission(permissions, 'orders')).toBe('none');
  });

  it('returns "none" for an empty permissions object', () => {
    expect(checkPermission({}, 'listings')).toBe('none');
  });
});

describe('hasAccess', () => {
  it('returns true when permission level is "full"', () => {
    const permissions: Partial<ShopPermissions> = { listings: 'full' };
    expect(hasAccess(permissions, 'listings')).toBe(true);
  });

  it('returns true when permission level is "view"', () => {
    const permissions: Partial<ShopPermissions> = { listings: 'view' };
    expect(hasAccess(permissions, 'listings')).toBe(true);
  });

  it('returns false when permission level is "none"', () => {
    const permissions: Partial<ShopPermissions> = { listings: 'none' };
    expect(hasAccess(permissions, 'listings')).toBe(false);
  });

  it('returns false when key is missing', () => {
    expect(hasAccess({}, 'listings')).toBe(false);
  });
});

describe('hasFullAccess', () => {
  it('returns true when permission level is "full"', () => {
    const permissions: Partial<ShopPermissions> = { listings: 'full' };
    expect(hasFullAccess(permissions, 'listings')).toBe(true);
  });

  it('returns false when permission level is "view"', () => {
    const permissions: Partial<ShopPermissions> = { listings: 'view' };
    expect(hasFullAccess(permissions, 'listings')).toBe(false);
  });

  it('returns false when permission level is "none"', () => {
    const permissions: Partial<ShopPermissions> = { listings: 'none' };
    expect(hasFullAccess(permissions, 'listings')).toBe(false);
  });

  it('returns false when key is missing', () => {
    expect(hasFullAccess({}, 'listings')).toBe(false);
  });
});

describe('meetsLevel', () => {
  it('returns true when user has full and full is required', () => {
    expect(meetsLevel(fullPermissions, 'listings', 'full')).toBe(true);
  });

  it('returns true when user has full and view is required', () => {
    expect(meetsLevel(fullPermissions, 'listings', 'view')).toBe(true);
  });

  it('returns true when user has full and none is required', () => {
    expect(meetsLevel(fullPermissions, 'listings', 'none')).toBe(true);
  });

  it('returns true when user has view and view is required', () => {
    const permissions: Partial<ShopPermissions> = { listings: 'view' };
    expect(meetsLevel(permissions, 'listings', 'view')).toBe(true);
  });

  it('returns false when user has view and full is required', () => {
    const permissions: Partial<ShopPermissions> = { listings: 'view' };
    expect(meetsLevel(permissions, 'listings', 'full')).toBe(false);
  });

  it('returns false when user has none and view is required', () => {
    const permissions: Partial<ShopPermissions> = { listings: 'none' };
    expect(meetsLevel(permissions, 'listings', 'view')).toBe(false);
  });

  it('returns true when none is required regardless of level', () => {
    expect(meetsLevel({}, 'listings', 'none')).toBe(true);
  });

  it('returns false when key is missing and view is required', () => {
    expect(meetsLevel({}, 'listings', 'view')).toBe(false);
  });
});
