import { useQuery } from '@tanstack/react-query';
import { getAllProducts, getUserProducts } from '@/features/products/services/product';

export function useAllProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: getAllProducts,
  });
}

export function useUserProducts(enabled = true) {
  return useQuery({
    queryKey: ['products', 'user'],
    queryFn: getUserProducts,
    enabled,
  });
}
