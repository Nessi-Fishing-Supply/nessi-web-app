import type { Database } from '@/types/database';

export type Follow = Database['public']['Tables']['follows']['Row'];

export type FollowInsert = Omit<
  Database['public']['Tables']['follows']['Insert'],
  'id' | 'created_at'
>;

export type FollowTargetType = 'member' | 'shop';

export type FollowStatus = { is_following: boolean };

export type FollowerCount = { count: number };

export type FollowingItem = {
  id: string;
  target_type: FollowTargetType;
  target_id: string;
  created_at: string;
  name: string;
  avatar_url: string | null;
};
