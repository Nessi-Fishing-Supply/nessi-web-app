import { Suspense } from 'react';
import OrdersPage from './orders-page';

export default function OrdersPageWrapper() {
  return (
    <Suspense>
      <OrdersPage />
    </Suspense>
  );
}
