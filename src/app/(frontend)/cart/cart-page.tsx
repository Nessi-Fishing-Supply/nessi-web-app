'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineShoppingCart, HiOutlineX } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import AlsoLikedStrip from '@/features/listings/components/also-liked-strip';
import {
  useCart,
  useRemoveFromCart,
  useClearCart,
  useValidateCart,
} from '@/features/cart/hooks/use-cart';
import { useGuestCart } from '@/features/cart/hooks/use-guest-cart';
import useContextStore from '@/features/context/stores/context-store';
import { groupCartBySeller } from '@/features/cart/utils/group-cart';
import CartItemCard from '@/features/cart/components/cart-item-card';
import CartSummary from '@/features/cart/components/cart-summary';
import Button from '@/components/controls/button';
import { formatPrice } from '@/features/shared/utils/format';
import { formatMemberName, getMemberInitials } from '@/features/members/utils/format-name';
import type { SellerIdentity } from '@/features/listings/types/listing';
import type { CartValidationResult } from '@/features/cart/types/cart';
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
  const router = useRouter();
  const activeContext = useContextStore.use.activeContext();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: cartItems, isLoading: cartLoading } = useCart();
  const {
    mutate: removeFromCart,
    isPending: isRemoving,
    variables: removingId,
  } = useRemoveFromCart();
  const { mutate: clearCart, isPending: isClearing } = useClearCart();
  const { mutate: validateCart } = useValidateCart();
  const guestCart = useGuestCart();

  const [staleBannerItems, setStaleBannerItems] = useState<CartValidationResult['removed']>([]);
  const [showStaleBanner, setShowStaleBanner] = useState(false);
  const hasValidated = useRef(false);
  const cartListingIds = useMemo(
    () => (cartItems ?? []).map((item) => item.listing_id),
    [cartItems],
  );

  // Shops cannot purchase — redirect to home
  useEffect(() => {
    if (activeContext.type === 'shop') {
      router.replace('/');
    }
  }, [activeContext.type, router]);

  useEffect(() => {
    if (isAuthenticated && user && !hasValidated.current) {
      hasValidated.current = true;
      validateCart(undefined, {
        onSuccess: (result) => {
          if (result.removed.length > 0) {
            setStaleBannerItems(result.removed);
            setShowStaleBanner(true);
            result.removed.forEach((removedItem) => {
              removeFromCart(removedItem.item.id);
            });
          }
        },
      });
    }
  }, [isAuthenticated, user, validateCart, removeFromCart]);

  if (activeContext.type === 'shop') {
    return null;
  }

  if (authLoading || (isAuthenticated && cartLoading)) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonTitle} aria-hidden="true" />
        <div className={styles.layout}>
          <div className={styles.itemsColumn}>
            <div className={styles.skeletonGroup}>
              <div className={styles.skeletonSellerHeader}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonSellerName} />
              </div>
              <div className={styles.skeletonCard} />
              <div className={styles.skeletonCard} />
            </div>
            <div className={styles.skeletonGroup}>
              <div className={styles.skeletonSellerHeader}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonSellerName} />
              </div>
              <div className={styles.skeletonCard} />
            </div>
          </div>
          <div className={styles.summaryColumn}>
            <div className={styles.skeletonSummary} />
          </div>
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          Loading your cart
        </span>
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
          <span>
            Subtotal ({guestItems.length} {guestItems.length === 1 ? 'item' : 'items'})
          </span>
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

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Your Cart</h1>

      {showStaleBanner && staleBannerItems.length > 0 && (
        <div className={styles.staleBanner} role="status" aria-live="polite">
          <div className={styles.staleBannerContent}>
            <p>
              <strong>
                {staleBannerItems.length}{' '}
                {staleBannerItems.length === 1 ? 'item was' : 'items were'} removed
              </strong>{' '}
              because {staleBannerItems.length === 1 ? 'it is' : 'they are'} no longer available.
            </p>
            <ul className={styles.staleBannerReasons}>
              {staleBannerItems.map((removed, i) => (
                <li key={i}>
                  {removed.item.listing?.title ?? 'Unknown item'} —{' '}
                  {removed.reason === 'sold'
                    ? 'Sold'
                    : removed.reason === 'deactivated'
                      ? 'Deactivated by seller'
                      : 'No longer available'}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            className={styles.staleBannerDismiss}
            onClick={() => setShowStaleBanner(false)}
            aria-label="Dismiss notification"
          >
            <HiOutlineX aria-hidden="true" />
          </button>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.itemsColumn}>
          {groups.map((group) => {
            const groupKey =
              group.seller?.type === 'shop'
                ? `shop:${group.seller.slug}`
                : `member:${group.seller?.slug ?? 'unknown'}`;
            return (
              <section key={groupKey} className={styles.sellerGroup}>
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
            );
          })}
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

      {user && (
        <div className={styles.recommendations}>
          <AlsoLikedStrip userId={user.id} excludeListingIds={cartListingIds} />
        </div>
      )}

      <div className={styles.stickyBar}>
        <div className={styles.stickyBarContent}>
          <div className={styles.stickyBarPrice}>
            <span className={styles.stickyBarLabel}>Subtotal</span>
            <span className={styles.stickyBarValue}>{formatPrice(subtotalCents)}</span>
          </div>
          <Button style="primary" disabled>
            Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
