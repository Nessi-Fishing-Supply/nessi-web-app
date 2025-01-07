"use client";

import React, { useEffect, useState } from 'react';
import { getAllProducts, Product } from '@services/product';
import ProductCard from '@components/cards/product-card';
import Grid from '@components/layout/grid';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getAllProducts();
        setProducts(data.map(product => ({
          ...product,
          id: product.id || '',
          price: typeof product.price === 'number' ? product.price : parseFloat(product.price)
        })));
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, []);

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
