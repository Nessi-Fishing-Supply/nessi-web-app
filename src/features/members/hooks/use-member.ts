import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getMember,
  getMemberBySlug,
  updateMember,
  checkSlugAvailable,
  completeOnboarding,
} from '@/features/members/services/member';
import type { MemberUpdateInput } from '@/features/members/types/member';

export function useMember(userId: string, enabled = true) {
  return useQuery({
    queryKey: ['members', userId],
    queryFn: () => getMember(userId),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useMemberBySlug(slug: string, enabled = true) {
  return useQuery({
    queryKey: ['members', 'slug', slug],
    queryFn: () => getMemberBySlug(slug),
    enabled,
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: MemberUpdateInput }) =>
      updateMember(userId, data),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['members', vars.userId] });
      const previous = queryClient.getQueryData(['members', vars.userId]);
      queryClient.setQueryData(['members', vars.userId], (old: unknown) =>
        old && typeof old === 'object' ? { ...old, ...vars.data } : old,
      );
      return { previous };
    },
    onError: (_err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['members', vars.userId], context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['members', vars.userId] });
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => completeOnboarding(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useSlugCheck(slug: string) {
  return useQuery({
    queryKey: ['slugs', 'check', slug],
    queryFn: () => checkSlugAvailable(slug),
    enabled: slug.length >= 2,
    staleTime: 30000,
  });
}
