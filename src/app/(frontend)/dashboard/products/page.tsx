'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth';
import { getUserProducts } from '@/services/product';
import type { ProductWithImages } from '@/types/product';
import ProductForm from '@/components/forms/add-product';
import ProductCard from '@/components/cards/product-card';
import Button from '@/components/controls/button';
import Modal from '@/components/layout/modal';
import axios from 'axios';
import Grid from '@/components/layout/grid';

const Products: React.FC = () => {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchProducts = async () => {
      if (!isAuthenticated) return;

      try {
        const data = await getUserProducts();
        setProducts(data);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          console.error('Unauthorized access.');
        } else {
          console.error('Error fetching products:', error as Error);
        }
      }
    };

    fetchProducts();
  }, [isAuthenticated]);

  const handleProductCreated = (newProduct: ProductWithImages) => {
    setProducts(prev => [...prev, newProduct]);
    setIsModalOpen(false);
  };

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
