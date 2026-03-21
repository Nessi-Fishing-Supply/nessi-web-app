import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMember,
  getMemberBySlug,
  updateMember,
  checkDisplayNameAvailable,
  checkSlugAvailable,
  completeOnboarding,
} from '@/features/members/services/member';
import type { MemberUpdateInput } from '@/features/members/types/member';

export function useMember(userId: string, enabled = true) {
  return useQuery({
    queryKey: ['members', userId],
    queryFn: () => getMember(userId),
    enabled,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
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

export function useDisplayNameCheck(name: string) {
  return useQuery({
    queryKey: ['members', 'display-name-check', name],
    queryFn: () => checkDisplayNameAvailable(name),
    enabled: name.length >= 2,
    staleTime: 30000,
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
