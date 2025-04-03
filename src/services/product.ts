import { Product, ProductWithImages } from '@/types/product';

const isServer = typeof window === 'undefined';
const BASE_URL = isServer
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/products`
  : '/api/products';

// Create a new product
export async function createProduct(data: Partial<Product & { images: { url: string }[] }>) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': data.userId!,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Failed to create product');
  return res.json() as Promise<ProductWithImages>;
}

// Get all products
export async function getAllProducts() {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json() as Promise<ProductWithImages[]>;
}

// Get all products created by a specific user
export async function getUserProducts(userId: string) {
  const res = await fetch(`${BASE_URL}/user`, {
    headers: {
      'x-user-id': userId,
    },
  });

  if (!res.ok) throw new Error('Failed to fetch user products');
  return res.json() as Promise<ProductWithImages[]>;
}

// Get a single product by its ID
export async function getProductById(id: string) {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json() as Promise<ProductWithImages>;
}

// Update a product by ID
export async function updateProduct(id: string, data: Partial<Product>) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': data.userId!,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Failed to update product');
  return res.json() as Promise<ProductWithImages>;
}

// Delete a product by ID
export async function deleteProduct(id: string) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) throw new Error('Failed to delete product');
  return res.json() as Promise<{ success: boolean }>;
}

// Upload product image
export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/products/upload", {
    method: "POST",
    body: formData,
  });

  const { url } = await res.json();
  return url;
}

