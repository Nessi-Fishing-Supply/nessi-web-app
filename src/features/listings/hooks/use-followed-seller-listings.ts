import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context';
import { getFollowedSellerListings } from '@/features/listings/services/listing';

export function useFollowedSellerListings() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['listings', 'followed-sellers'],
    queryFn: getFollowedSellerListings,
    enabled: isAuthenticated && !authLoading,
  });

  return { data, isLoading };
}
