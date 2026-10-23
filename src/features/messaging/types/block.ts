import type { Database } from '@/types/database';

export type MemberBlock = Database['public']['Tables']['member_blocks']['Row'];
export type MemberBlockInsert = Database['public']['Tables']['member_blocks']['Insert'];
