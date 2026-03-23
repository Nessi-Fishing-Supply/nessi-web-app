import CartPage from './cart-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Cart',
};

export default function Page() {
  return <CartPage />;
}
