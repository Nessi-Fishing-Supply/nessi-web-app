'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context';
import { useUserProducts } from '@/features/products/hooks/use-products';
import type { ProductWithImages } from '@/features/products/types/product';
import ProductForm from '@/features/products/components/add-product-form';
import ProductCard from '@/features/products/components/product-card';
import Button from '@/components/controls/button';
import Modal from '@/components/layout/modal';
import Grid from '@/components/layout/grid';

const Products: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useUserProducts(isAuthenticated);

  const handleProductCreated = (newProduct: ProductWithImages) => {
    queryClient.setQueryData<ProductWithImages[]>(['products', 'user'], (old = []) => [
      ...old,
      newProduct,
    ]);
    setIsModalOpen(false);
  };

  if (isLoading) {
    return <p>Loading your products...</p>;
  }

  return (
    <div>
      <h1>Products</h1>
      <p>Welcome to your products!</p>
      <Button onClick={() => setIsModalOpen(true)}>Add a New Product</Button>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ProductForm onProductCreated={handleProductCreated} />
      </Modal>
      {products.length === 0 ? (
        <p>You don&#39;t have any products currently.</p>
      ) : (
        <Grid columns={4}>
          {products.map((product: ProductWithImages) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </Grid>
      )}
    </div>
  );
};

export default Products;
