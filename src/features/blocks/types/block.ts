import type { Database } from '@/types/database';

export type MemberBlock = Database['public']['Tables']['member_blocks']['Row'];

export type BlockedMemberItem = {
  id: string;
  blocked_id: string;
  created_at: string;
  name: string;
  avatar_url: string | null;
  slug: string | null;
};
