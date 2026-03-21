// @ts-nocheck
import { createClient } from '@/libs/supabase/server';
import { notFound } from 'next/navigation';
import ProductClientComponent from './item-id-page';
import type { ProductWithImages } from '@/features/products/types/product';
import type { Metadata } from 'next';

async function getProduct(id: string): Promise<ProductWithImages | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as ProductWithImages;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return { title: 'Product Not Found' };
  }

  const price =
    typeof product.price === 'number'
      ? product.price.toFixed(2)
      : parseFloat(product.price).toFixed(2);

  const image = product.product_images?.[0]?.image_url;

  return {
    title: product.title,
    description: product.description || `${product.title} — $${price} on Nessi`,
    openGraph: {
      title: product.title,
      description: product.description || `${product.title} — $${price} on Nessi`,
      ...(image && { images: [{ url: image }] }),
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return <ProductClientComponent product={product} />;
}
