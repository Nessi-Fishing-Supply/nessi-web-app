'use client';

import Link from 'next/link';
import { HiOutlineShoppingBag } from 'react-icons/hi';
import { useCartBadgeCount } from '@/features/cart/hooks/use-cart';

import styles from './cart-icon.module.scss';

export default function CartIcon() {
  const count = useCartBadgeCount();

  return (
    <Link
      href="/cart"
      className={styles.link}
      aria-label={count > 0 ? `Cart, ${count} items` : 'Cart'}
    >
      <HiOutlineShoppingBag className={styles.icon} aria-hidden="true" />
      {count > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {count}
        </span>
      )}
    </Link>
  );
}
