import { del, get, post } from '@/libs/fetch';
import type { ShopInvite, ShopInviteWithInviter } from '@/features/shops/types/invite';

export async function getShopInvites(shopId: string): Promise<ShopInviteWithInviter[]> {
  return get(`/api/shops/${shopId}/invites`);
}

export async function createShopInvite(
  shopId: string,
  data: { email: string; roleId: string },
): Promise<ShopInvite> {
  return post(`/api/shops/${shopId}/invites`, data);
}

export async function resendShopInvite(shopId: string, inviteId: string): Promise<ShopInvite> {
  return post(`/api/shops/${shopId}/invites/${inviteId}/resend`);
}

export async function revokeShopInvite(
  shopId: string,
  inviteId: string,
): Promise<{ success: true }> {
  return del(`/api/shops/${shopId}/invites/${inviteId}`);
}
