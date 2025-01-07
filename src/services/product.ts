import axios from 'axios';

const API_URL = 'http://localhost:5003/products';

const getHeaders = (token: string) => ({
  Authorization: `${token}`
});

export interface Product {
  id?: string;
  status?: string;
  title: string;
  description: string;
  price: number;
  images: { url: string, name: string }[];
  userId: string;
  created_at?: string;
  updated_at?: string;
}

export const createProduct = async (product: Product, token: string) => {
  const formattedProduct = {
    title: product.title,
    description: product.description,
    price: product.price,
    images: product.images.map(image => ({ url: image.url, name: image.name })),
    userId: product.userId
  };
  try {
    const response = await axios.post(API_URL, formattedProduct, {
      headers: getHeaders(token)
    });
    if (response.status === 201) {
      return response.data;
    } else {
      throw new Error('Failed to create product');
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response ? error.response.data : error.message);
    } else {
      throw new Error('Unexpected error in createProduct');
    }
  }
};

export const getAllProducts = async (): Promise<Product[]> => {
  const response = await axios.get(API_URL);
  return response.data.map((product: any) => ({
    ...product,
    images: product.images.map((image: { image_url: string, name: string }) => ({
      url: image.image_url,
      name: image.name
    }))
  }));
};

export const getProductById = async (id: string) => {
  const response = await axios.get(`${API_URL}/${id}`);
  const product = response.data;
  return {
    ...product,
    price: parseFloat(product.price),
    images: product.images.map((image: { image_url: string; name: string }) => ({
      url: image.image_url,
      name: image.name
    }))
  };
};

export const deleteProduct = async (id: string, token: string) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: getHeaders(token)
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response && error.response.status === 404) {
        throw new Error('Product not found');
      }
      throw new Error(error.response ? error.response.data : error.message);
    } else {
      throw new Error('Unexpected error in deleteProduct');
    }
  }
};

export const getProductsByUserId = async (token: string): Promise<Product[]> => {
  try {
    const response = await axios.get(`${API_URL}/user`, {
      headers: getHeaders(token)
    });
    return response.data.map((product: any) => ({
      ...product,
      images: product.images.map((image: { image_url: string, name: string }) => ({
        url: image.image_url,
        name: image.name
      }))
    }));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response ? error.response.data : error.message);
    } else {
      throw new Error('Unexpected error in getProductsByUserId');
    }
  }
};

export const updateProduct = async (id: string, product: {
  title?: string;
  description?: string;
  price?: number;
  images?: { url: string, name: string }[];
}, token: string) => {
  const formattedProduct = {
    ...product,
    images: product.images ? product.images.map(image => ({ url: image.url, name: image.name })) : undefined
  };
  try {
    const response = await axios.put(`${API_URL}/${id}`, formattedProduct, {
      headers: getHeaders(token)
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response ? error.response.data : error.message);
    } else {
      throw new Error('Unexpected error in updateProduct');
    }
  }
};
