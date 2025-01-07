import { getProductById, getAllProducts, Product } from '@services/product';
import ProductClientComponent from './ItemIdPage';

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((product: Product) => ({
    id: product.id,
  }));
}

const ProductPage = async ({ params }: { params: { id: string } }) => {
  const product = await getProductById(params.id);

  return <ProductClientComponent product={product} />;
};

export default ProductPage;
