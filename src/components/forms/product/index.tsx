import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@context/auth';
import { createProduct, getProductsByUserId } from '@services/product';
import axios from 'axios';
import { useForm, FormProvider } from 'react-hook-form';
import Input from '@components/controls/input';
import Textarea from '@components/controls/text-area';
import Button from '@components/controls/button';

const ProductForm: React.FC<{ onProductCreated: (products: any[]) => void }> = ({ onProductCreated }) => {
  const methods = useForm();
  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    price: 0,
    images: [{ id: Date.now(), url: '', name: '' }],
    userId: ''
  });
  const { token, userProfile } = useAuth();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProduct(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prevState => {
          const images = [...prevState.images];
          images[index] = { ...images[index], url: reader.result as string, name: file.name };
          return { ...prevState, images };
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const addImageField = () => {
    setNewProduct(prevState => ({
      ...prevState,
      images: [...prevState.images, { id: Date.now(), url: '', name: '' }]
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (token && userProfile) {
      const product = { ...newProduct, userId: userProfile.id };
      try {
        await createProduct(product, token);
        const data = await getProductsByUserId(token);
        onProductCreated(data);
        setNewProduct({
          title: '',
          description: '',
          price: 0,
          images: [{ id: Date.now(), url: '', name: '' }],
          userId: ''
        });
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('Error creating product:', error.response ? error.response.data : error.message);
        } else {
          console.error('Unexpected error creating product:', error as Error);
        }
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
          onChange={(e) => handleInputChange(e as ChangeEvent<HTMLInputElement>)}
          placeholder="Title"
          isRequired
        />
        <Textarea
          name="description"
          value={newProduct.description}
          onChange={(e) => handleInputChange(e as ChangeEvent<HTMLTextAreaElement>)}
          placeholder="Description"
          isRequired
        />
        <Input
          type="number"
          name="price"
          value={String(newProduct.price)}
          onChange={(e) => handleInputChange(e as ChangeEvent<HTMLInputElement>)}
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
        <Button type="button" style="secondary" outline onClick={addImageField}>Add Another Image</Button>
        <Button type="submit">Add Product</Button>
      </form>
    </FormProvider>
  );
};

export default ProductForm;
