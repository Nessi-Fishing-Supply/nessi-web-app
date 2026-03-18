'use client';

import { ProductWithImages } from '@/features/products/types/product';
import Image from 'next/image';
import React from 'react';

const ProductClientComponent = ({ product }: { product: ProductWithImages }) => {
  if (!product) return <p>No product found</p>;

  return (
    <div>
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <p>
        Price: $
        {typeof product.price === 'string'
          ? parseFloat(product.price).toFixed(2)
          : product.price.toFixed(2)}
      </p>

      <div>
        {product.product_images.map(
          (image, index) =>
            image.image_url && (
              <Image
                key={index}
                src={image.image_url}
                alt={`${product.title} image ${index + 1}`}
                width={500}
                height={500}
              />
            ),
        )}
      </div>
    </div>
  );
};

export default ProductClientComponent;
