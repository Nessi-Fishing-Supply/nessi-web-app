import axios from 'axios';

const API_URL = 'http://localhost:5003/products';

const getHeaders = (token: string) => ({
  Authorization: `${token}`
});

export const createProduct = async (product: {
  title: string;
  description: string;
  price: number;
  images: { url: string, name: string }[];
  userId: string;
}, token: string) => {
  const formattedProduct = {
    ...product,
    images: product.images.map(image => ({ image_url: image.url }))
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

export const getAllProducts = async () => {
  const response = await axios.get(API_URL);
  return response.data.map((product: any) => ({
    ...product,
    images: product.images.map((image: { image_url: string }) => ({ image_url: image.image_url }))
  }));
};

export const getProductById = async (id: string) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
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

export const getProductsByUserId = async (token: string) => {
  try {
    const response = await axios.get(`${API_URL}/user`, {
      headers: getHeaders(token)
    });
    return response.data.map((product: any) => ({
      ...product,
      images: product.images.map((image: { image_url: string }) => ({ image_url: image.image_url }))
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
  images?: { url: string }[];
}, token: string) => {
  const formattedProduct = {
    ...product,
    images: product.images ? product.images.map(image => ({ image_url: image.url })) : undefined
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
