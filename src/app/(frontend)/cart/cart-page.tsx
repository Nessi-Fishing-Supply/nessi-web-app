'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineShoppingCart } from 'react-icons/hi';
import { useAuth } from '@/features/auth/context';
import { useCart, useRemoveFromCart, useClearCart, useValidateCart } from '@/features/cart/hooks/use-cart';
import { useGuestCart } from '@/features/cart/hooks/use-guest-cart';
import { groupCartBySeller } from '@/features/cart/utils/group-cart';
import CartItemCard from '@/features/cart/components/cart-item-card';
import CartSummary from '@/features/cart/components/cart-summary';
import Button from '@/components/controls/button';
import { formatPrice } from '@/features/shared/utils/format';
import { formatMemberName, getMemberInitials } from '@/features/members/utils/format-name';
import type { SellerIdentity } from '@/features/listings/types/listing';
import styles from './cart-page.module.scss';

function getShopInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

function SellerHeader({ seller }: { seller: SellerIdentity | null }) {
  if (!seller) return null;

  const isShop = seller.type === 'shop';
  const displayName = isShop
    ? seller.shop_name
    : formatMemberName(seller.first_name, seller.last_name);
  const initials = isShop
    ? getShopInitials(seller.shop_name)
    : getMemberInitials(seller.first_name, seller.last_name);
  const href = isShop ? `/shop/${seller.slug}` : `/member/${seller.slug}`;

  return (
    <div className={styles.sellerHeader}>
      <Link href={href} className={styles.sellerLink} aria-label={`View ${displayName}'s profile`}>
        <div className={styles.sellerAvatar}>
          {seller.avatar_url ? (
            <Image
              src={seller.avatar_url}
              alt={displayName}
              width={32}
              height={32}
              sizes="32px"
              style={{ objectFit: 'cover' }}
              className={styles.sellerAvatarImage}
            />
          ) : (
            <span className={styles.sellerAvatarFallback} aria-hidden="true">
              {initials}
            </span>
          )}
        </div>
        <span className={styles.sellerName}>{displayName}</span>
      </Link>
    </div>
  );
}

export default function CartPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: cartItems, isLoading: cartLoading } = useCart();
  const { mutate: removeFromCart, isPending: isRemoving, variables: removingId } = useRemoveFromCart();
  const { mutate: clearCart, isPending: isClearing } = useClearCart();
  const { mutate: validateCart, data: validationResult } = useValidateCart();
  const guestCart = useGuestCart();

  useEffect(() => {
    if (isAuthenticated && user) {
      validateCart(undefined);
    }
  }, [isAuthenticated, user, validateCart]);

  if (authLoading || (isAuthenticated && cartLoading)) {
    return (
      <div className={styles.page}>
        <div className={styles.loading} aria-live="polite" aria-busy="true">
          Loading your cart…
        </div>
      </div>
    );
  }

  // Guest cart view
  if (!isAuthenticated) {
    const { items: guestItems } = guestCart;

    if (guestItems.length === 0) {
      return (
        <div className={styles.page}>
          <h1 className={styles.pageTitle}>Your Cart</h1>
          <div className={styles.emptyState}>
            <HiOutlineShoppingCart className={styles.emptyIcon} aria-hidden="true" />
            <h2 className={styles.emptyHeading}>Your cart is empty</h2>
            <p className={styles.emptyText}>Browse fishing gear to find something you love</p>
            <Link href="/">
              <Button style="primary">Start Shopping</Button>
            </Link>
          </div>
        </div>
      );
    }

    const guestSubtotal = guestItems.reduce((sum, item) => sum + item.priceAtAdd, 0);

    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Your Cart</h1>
        <div className={styles.guestNotice} role="status">
          <p>Sign in to complete your purchase and save your cart.</p>
          <Link href="/auth/login">
            <Button style="primary">Sign In to Checkout</Button>
          </Link>
        </div>
        <div className={styles.guestItems}>
          {guestItems.map((item) => (
            <div key={item.listingId} className={styles.guestItem}>
              <div className={styles.guestItemInfo}>
                <Link href={`/listing/${item.listingId}`} className={styles.guestItemLink}>
                  View listing
                </Link>
                <span className={styles.guestItemPrice}>{formatPrice(item.priceAtAdd)}</span>
              </div>
              <button
                type="button"
                className={styles.guestRemoveButton}
                onClick={() => guestCart.remove(item.listingId)}
                aria-label="Remove item from cart"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className={styles.guestSubtotal}>
          <span>Subtotal ({guestItems.length} {guestItems.length === 1 ? 'item' : 'items'})</span>
          <span>{formatPrice(guestSubtotal)}</span>
        </div>
      </div>
    );
  }

  // Authenticated cart — empty state
  if (!cartItems || cartItems.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Your Cart</h1>
        <div className={styles.emptyState}>
          <HiOutlineShoppingCart className={styles.emptyIcon} aria-hidden="true" />
          <h2 className={styles.emptyHeading}>Your cart is empty</h2>
          <p className={styles.emptyText}>Browse fishing gear to find something you love</p>
          <Link href="/">
            <Button style="primary">Start Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  const groups = groupCartBySeller(cartItems);
  const subtotalCents = cartItems.reduce((sum, item) => sum + item.listing.price_cents, 0);
  const removedItems = validationResult?.removed ?? [];

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Your Cart</h1>

      {removedItems.length > 0 && (
        <div className={styles.staleBanner} role="alert">
          <p>
            {removedItems.length} {removedItems.length === 1 ? 'item has' : 'items have'} been
            removed from your cart because they are no longer available.
          </p>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.itemsColumn}>
          {groups.map((group, index) => (
            <section key={index} className={styles.sellerGroup}>
              <SellerHeader seller={group.seller} />
              <div className={styles.sellerItems}>
                {group.items.map((item) => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    onRemove={(cartItemId) => removeFromCart(cartItemId)}
                    isRemoving={isRemoving && removingId === item.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className={styles.summaryColumn}>
          <CartSummary
            itemCount={cartItems.length}
            subtotalCents={subtotalCents}
            onClearCart={() => clearCart()}
            isClearing={isClearing}
          />
        </div>
      </div>
    </div>
  );
}
