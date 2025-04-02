import { getProductById, getAllProducts, Product } from '@services/product';
import ProductClientComponent from './ItemIdPage';

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((product: Product) => ({
    id: product.id,
  }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    return <p>No product found</p>;
  }

  const product = await getProductById(id);

  return <ProductClientComponent product={product} />;
}
