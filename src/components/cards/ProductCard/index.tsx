import React from 'react';
import styles from './ProductCard.module.scss';
import { deleteProduct } from '@services/product';
import { useAuth } from '@context/auth';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    description: string;
    price: number | string;
    images: { image_url: string }[];
    userId: string;
    status: string;
  };
  onProductDeleted: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onProductDeleted }) => {
  const { token, userProfile } = useAuth();
  const router = useRouter();
  const price = typeof product.price === 'number' ? product.price.toFixed(2) : parseFloat(product.price).toFixed(2);

  const handleDelete = async () => {
    if (token) {
      try {
        await deleteProduct(product.id, token);
        onProductDeleted(product.id);
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          console.error('Error deleting product:', error.response ? error.response.data : error.message);
        } else if (error instanceof Error) {
          console.error('Unexpected error deleting product:', error.message);
        } else {
          console.error('Unexpected error deleting product');
        }
      }
    }
  };

  const handleViewDetails = () => {
    router.push(`/item/${product.id}`);
  };

  return (
    <div className={styles.card}>
      {product.images.length > 0 && product.images.map((image, index) => (
        <img key={index} src={image.image_url} alt={`${product.title} image ${index + 1}`} />
      ))}
      <h2>{product.title}</h2>
      <p>{product.description}</p>
      <p>Price: ${price}</p>
      <p>Status: {product.status}</p>
      <p>Id: {product.id}</p>
      {userProfile?.id === product.userId && (
        <button onClick={handleDelete}>Delete Product</button>
      )}
      <button onClick={handleViewDetails}>View Details</button>
    </div>
  );
};

export default ProductCard;
