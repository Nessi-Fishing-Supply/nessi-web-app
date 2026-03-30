'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context';
import { getBlockedMembers, unblockMember } from '@/features/blocks/services/block';
import type { BlockedMemberItem } from '@/features/blocks/types/block';

export function useBlockedMembers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['blocks', user?.id],
    queryFn: getBlockedMembers,
    enabled: !!user?.id,
  });
}

export function useUnblockMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (blockedId: string) => unblockMember(blockedId),
    onMutate: async (blockedId) => {
      await queryClient.cancelQueries({ queryKey: ['blocks', user?.id] });
      const previousBlocks = queryClient.getQueryData<BlockedMemberItem[]>(['blocks', user?.id]);
      queryClient.setQueryData<BlockedMemberItem[]>(['blocks', user?.id], (old) =>
        old?.filter((block) => block.blocked_id !== blockedId),
      );
      return { previousBlocks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousBlocks) {
        queryClient.setQueryData(['blocks', user?.id], context.previousBlocks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks', user?.id] });
    },
  });
}
