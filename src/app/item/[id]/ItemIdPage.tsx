"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Product } from '@services/product';

const ProductClientComponent = ({ product }: { product: Product }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product) {
      setLoading(true);
      // Fetch product logic if needed
      setLoading(false);
    }
  }, [product]);

  if (loading) return <p>Loading...</p>;
  if (!product) return <p>No product found</p>;

  return (
    <div>
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <p>Price: ${product.price}</p>
      <div>
        {product.images.map((image, index) => (
          image.url ? (
            <Image
              key={index}
              src={image.url}
              alt={product.title}
              width={500}
              height={500}
            />
          ) : null
        ))}
      </div>
    </div>
  );
};

export default ProductClientComponent;