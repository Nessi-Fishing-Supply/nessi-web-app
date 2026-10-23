'use client';

import Link from 'next/link';
import Button from '@/components/controls/button';
import { useAuth } from '@/features/auth/context';
import { useToast } from '@/components/indicators/toast/context';
import { useAddToCart, useCart } from '@/features/cart/hooks/use-cart';
import { useGuestCart } from '@/features/cart/hooks/use-guest-cart';
import useContextStore from '@/features/context/stores/context-store';
import type { CartItemWithListing } from '@/features/cart/types/cart';

import styles from './add-to-cart-button.module.scss';

interface AddToCartButtonProps {
  listingId: string;
  priceCents: number;
  currentUserId?: string | null;
  sellerId: string;
  shopId?: string | null;
  fullWidth?: boolean;
}

export default function AddToCartButton({
  listingId,
  priceCents,
  currentUserId,
  sellerId,
  shopId,
  fullWidth = true,
}: AddToCartButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const addToCart = useAddToCart();
  const cartQuery = useCart();
  const guestCart = useGuestCart();
  const activeContext = useContextStore.use.activeContext();

  // Shops cannot purchase — hide button in shop context
  if (activeContext.type === 'shop') {
    return null;
  }

  // Hide for own member listings, but allow purchasing from own shops
  if (currentUserId && currentUserId === sellerId && !shopId) {
    return null;
  }

  const isAuthenticatedInCart = !!cartQuery.data?.find(
    (item: CartItemWithListing) => item.listing_id === listingId,
  );
  const isGuestInCart = !user && guestCart.isInCart(listingId);
  const isAlreadyInCart = user ? isAuthenticatedInCart : isGuestInCart;

  if (isAlreadyInCart) {
    return (
      <Link href="/cart" className={styles.inCartLink}>
        In Your Cart
      </Link>
    );
  }

  function handleAuthAdd() {
    addToCart.mutate(
      { listingId, addedFrom: 'listing_detail' },
      {
        onSuccess: () => {
          showToast({
            message: 'Added to cart',
            description: 'Your item has been added to your cart.',
            type: 'success',
          });
        },
        onError: (error: Error) => {
          showToast({
            message: error.message || 'Something went wrong',
            description: 'Unable to add item to cart. Please try again.',
            type: 'error',
          });
        },
      },
    );
  }

  function handleGuestAdd() {
    const result = guestCart.add({
      listingId,
      priceAtAdd: priceCents,
      addedAt: new Date().toISOString(),
      addedFrom: 'listing_detail',
    });

    if (result === 'added') {
      showToast({
        message: 'Added to cart',
        description: 'Your item has been added to your cart.',
        type: 'success',
      });
    } else if (result === 'full') {
      showToast({
        message: 'Cart is full (25 items)',
        description: 'Remove an item before adding more.',
        type: 'error',
      });
    }
    // 'duplicate' is handled silently since isAlreadyInCart check above catches it on re-render
  }

  function handleClick() {
    if (user) {
      handleAuthAdd();
    } else {
      handleGuestAdd();
    }
  }

  return (
    <div className={fullWidth ? styles.wrapper : styles.wrapperAuto}>
      <Button
        style="secondary"
        outline
        fullWidth={fullWidth}
        loading={addToCart.isPending}
        onClick={handleClick}
        ariaLabel="Add to cart"
      >
        Add to Cart
      </Button>
    </div>
  );
}
