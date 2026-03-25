import type { Database } from '@/types/database';

export type ShopInvite = Database['public']['Tables']['shop_invites']['Row'];

export type ShopInviteWithInviter = ShopInvite & {
  members: { first_name: string | null; last_name: string | null } | null;
};

export interface InvitePageData {
  token: string;
  shopName: string;
  shopAvatarUrl: string | null;
  inviterName: string;
  roleName: string;
  expiresAt: string;
  status: 'pending' | 'expired' | 'accepted' | 'revoked';
}
