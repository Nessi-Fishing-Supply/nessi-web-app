import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProfile,
  getProfileBySlug,
  updateProfile,
  checkDisplayNameAvailable,
  completeOnboarding,
} from '@/features/profiles/services/profile';
import type { ProfileUpdateInput } from '@/features/profiles/types/profile';

export function useProfile(userId: string, enabled = true) {
  return useQuery({
    queryKey: ['profiles', userId],
    queryFn: () => getProfile(userId),
    enabled,
  });
}

export function useProfileBySlug(slug: string, enabled = true) {
  return useQuery({
    queryKey: ['profiles', 'slug', slug],
    queryFn: () => getProfileBySlug(slug),
    enabled,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: ProfileUpdateInput }) =>
      updateProfile(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => completeOnboarding(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

export function useDisplayNameCheck(name: string) {
  return useQuery({
    queryKey: ['profiles', 'display-name-check', name],
    queryFn: () => checkDisplayNameAvailable(name),
    enabled: name.length >= 2,
    staleTime: 30000,
  });
}
