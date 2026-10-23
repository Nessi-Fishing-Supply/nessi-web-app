import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useContextStore from '@/features/context/stores/context-store';
import {
  getListings,
  getListingById,
  getSellerListings,
  getDrafts,
  createListing,
  createDraft,
  duplicateListing,
  updateListing,
  deleteListing,
  deleteDraft,
  updateListingStatus,
  incrementViewCount,
} from '@/features/listings/services/listing';
import type { ListingFilters } from '@/features/listings/services/listing';
import type { ListingWithPhotos } from '@/features/listings/types/listing';

export function useListings(filters: ListingFilters = {}) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => getListings(filters),
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ['listings', id],
    queryFn: () => getListingById(id!),
    enabled: !!id,
  });
}

export function useSellerListings(status?: string) {
  const activeContext = useContextStore.use.activeContext();
  const contextKey = activeContext.type === 'shop' ? `shop:${activeContext.shopId}` : 'member';

  return useQuery({
    queryKey: ['listings', 'seller', contextKey, status],
    queryFn: () => getSellerListings(status),
  });
}

export function useDrafts() {
  return useQuery({
    queryKey: ['listings', 'drafts'],
    queryFn: getDrafts,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useCreateDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useDuplicateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => duplicateListing(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateListing(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['listings'] });
      const previousSeller = queryClient.getQueriesData<ListingWithPhotos[]>({
        queryKey: ['listings', 'seller'],
      });
      queryClient.setQueriesData<ListingWithPhotos[]>({ queryKey: ['listings', 'seller'] }, (old) =>
        old?.map((l) => (l.id === id ? { ...l, ...data } : l)),
      );
      return { previousSeller };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousSeller) {
        for (const [key, data] of context.previousSeller) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['listings'] });
      const previousSeller = queryClient.getQueriesData<ListingWithPhotos[]>({
        queryKey: ['listings', 'seller'],
      });
      queryClient.setQueriesData<ListingWithPhotos[]>({ queryKey: ['listings', 'seller'] }, (old) =>
        old?.filter((l) => l.id !== id),
      );
      return { previousSeller };
    },
    onError: (_err, _id, context) => {
      if (context?.previousSeller) {
        for (const [key, data] of context.previousSeller) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDraft(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useUpdateListingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      sold_price_cents,
    }: {
      id: string;
      status: string;
      sold_price_cents?: number;
    }) => updateListingStatus(id, status, sold_price_cents),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['listings'] });
      const previousSeller = queryClient.getQueriesData<ListingWithPhotos[]>({
        queryKey: ['listings', 'seller'],
      });
      queryClient.setQueriesData<ListingWithPhotos[]>({ queryKey: ['listings', 'seller'] }, (old) =>
        old?.map((l) =>
          l.id === id
            ? {
                ...l,
                status: status as ListingWithPhotos['status'],
                ...(status === 'sold' ? { sold_at: new Date().toISOString() } : {}),
                ...(status === 'deleted' ? { deleted_at: new Date().toISOString() } : {}),
              }
            : l,
        ),
      );
      return { previousSeller };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousSeller) {
        for (const [key, data] of context.previousSeller) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useIncrementViewCount() {
  return useMutation({
    mutationFn: (id: string) => incrementViewCount(id),
  });
}
