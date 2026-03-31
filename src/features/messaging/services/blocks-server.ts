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
      const { data: existing, error: fetchError } = await supabase
        .from('member_blocks')
        .select()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId)
        .single();

      if (fetchError || !existing) {
        throw new Error(`Failed to fetch existing block: ${fetchError?.message}`);
      }

      return existing as MemberBlock;
    }
    throw new Error(`Failed to block member: ${error.message}`);
  }

  return block as MemberBlock;
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

export async function isBlockedServer(blockerId: string, blockedId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('member_blocks')
    .select('id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle();

  if (error) {
    console.error('[isBlockedServer] query failed:', error.message);
  }

  return data !== null;
}

export async function getBlockedMembersServer(blockerId: string): Promise<MemberBlock[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('member_blocks')
    .select()
    .eq('blocker_id', blockerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get blocked members: ${error.message}`);
  }

  return (data ?? []) as MemberBlock[];
}
