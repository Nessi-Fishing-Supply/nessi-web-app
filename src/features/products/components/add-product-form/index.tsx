'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/features/auth/context';
import { createProduct, uploadProductImage } from '@/features/products/services/product';
import axios from 'axios';
import { useForm, FormProvider } from 'react-hook-form';
import Input from '@/components/controls/input';
import Textarea from '@/components/controls/text-area';
import Button from '@/components/controls/button';
import type { ProductWithImages } from '@/features/products/types/product';

interface AddProductFormProps {
  onProductCreated: (product: ProductWithImages) => void;
}

const AddProductForm: React.FC<AddProductFormProps> = ({ onProductCreated }) => {
  const methods = useForm();
  const { isAuthenticated } = useAuth();

  const [newProduct, setNewProduct] = useState<{
    title: string;
    description: string;
    price: string;
    images: { id: number; file: File | null; url: string; name: string }[];
  }>({
    title: '',
    description: '',
    price: '',
    images: [{ id: 0, file: null, url: '', name: '' }],
  });

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewProduct((prev) => {
      const updatedImages = [...prev.images];
      updatedImages[index] = {
        ...updatedImages[index],
        file,
        name: file.name,
      };
      return { ...prev, images: updatedImages };
    });
  };

  const addImageField = () => {
    setNewProduct((prev) => ({
      ...prev,
      images: [...prev.images, { id: Date.now(), file: null, url: '', name: '' }],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    try {
      // Upload images during form submission
      const uploadedImages = await Promise.all(
        newProduct.images.map(async (image) => {
          if (!image.file) return image;

          const url = await uploadProductImage(image.file);
          return {
            ...image,
            url,
          };
        }),
      );

      const payload = {
        ...newProduct,
        images: uploadedImages.map(({ url, name }) => ({ url, name })),
      };

      const createdProduct = await createProduct(payload);

      const fullProduct: ProductWithImages = {
        ...createdProduct,
        product_images: uploadedImages.map((img) => ({
          id: `${Date.now()}-${img.name}`,
          image_url: img.url,
          product_id: createdProduct.id,
          created_at: new Date().toISOString(),
        })),
      };

      onProductCreated(fullProduct);

      setNewProduct({
        title: '',
        description: '',
        price: '',
        images: [{ id: 0, file: null, url: '', name: '' }],
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error creating product:', error.response?.data || error.message);
      } else {
        console.error('Unexpected error:', error as Error);
      }
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit}>
        <Input
          type="text"
          name="title"
          value={newProduct.title}
          onChange={handleInputChange}
          placeholder="Title"
          isRequired
        />
        <Textarea
          name="description"
          value={newProduct.description}
          onChange={handleInputChange}
          placeholder="Description"
          isRequired
        />
        <Input
          type="number"
          name="price"
          value={newProduct.price}
          onChange={handleInputChange}
          placeholder="Price"
          isRequired
        />
        {newProduct.images.map((image, index) => (
          <Input
            key={image.id}
            type="file"
            name={`image-${index}`}
            onChange={(e) => handleImageChange(e as ChangeEvent<HTMLInputElement>, index)}
            isRequired
          />
        ))}

        <Button type="button" style="secondary" outline onClick={addImageField}>
          Add Another Image
        </Button>
        <Button type="submit">Add Product</Button>
      </form>
    </FormProvider>
  );
};

export default AddProductForm;
