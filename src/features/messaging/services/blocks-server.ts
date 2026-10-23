import { createClient } from '@/libs/supabase/server';
import type { MemberBlock } from '@/features/messaging/types/block';

export async function blockMemberServer(
  blockerId: string,
  blockedId: string,
): Promise<MemberBlock> {
  if (blockerId === blockedId) {
    throw new Error('Cannot block yourself');
  }

  const supabase = await createClient();

  const { data: block, error } = await supabase
    .from('member_blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Already blocked');
    }
    throw new Error(`Failed to block member: ${error.message}`);
  }

  return block;
}

export async function unblockMemberServer(
  blockerId: string,
  blockedId: string,
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('member_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .select();

  if (error) {
    throw new Error(`Failed to unblock member: ${error.message}`);
  }

  return { success: Array.isArray(data) && data.length > 0 };
}
