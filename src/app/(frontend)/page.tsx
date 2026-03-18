'use client';

import React from 'react';
import { useAllProducts } from '@/features/products/hooks/use-products';
import ProductCard from '@/features/products/components/product-card';
import Grid from '@/components/layout/grid';

export default function Home() {
  const { data: products = [], isLoading } = useAllProducts();

  if (isLoading) {
    return <p>Loading products...</p>;
  }

  return (
    <div>
      <main>
        {products.length === 0 ? (
          <p>No products available.</p>
        ) : (
          <Grid columns={4}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </Grid>
        )}
      </main>
    </div>
  );
}
