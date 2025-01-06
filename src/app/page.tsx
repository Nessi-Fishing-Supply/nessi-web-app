"use client";

import AppLink from "@components/controls/app-link";
import React, { useEffect, useState } from 'react';
import { getAllProducts } from '@services/product';
import ProductCard from '@components/cards/product-card';
import Grid from '@components/layout/grid';
import styles from './Home.module.scss';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number | string;
  images: { image_url: string }[];
  userId: string;
  status: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getAllProducts();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, []);

  const handleProductDeleted = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  return (
    <div>
      <main>
        {products.length === 0 ? (
          <p>No products available.</p>
        ) : (
          <Grid columns={4}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onProductDeleted={handleProductDeleted} />
            ))}
          </Grid>
        )}
      </main>
    </div>
  );
}
