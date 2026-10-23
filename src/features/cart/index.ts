// Types
export type {
  CartItem,
  CartItemInsert,
  CartItemWithListing,
  GuestCartItem,
  CartValidationResult,
} from './types/cart';

// Client Services
export {
  getCart,
  getCartCount,
  addToCart,
  removeFromCart,
  clearCart,
  validateCart,
  refreshExpiry,
  mergeGuestCart,
} from './services/cart';

// Server Services
export {
  getCartServer,
  getCartCountServer,
  addToCartServer,
  removeFromCartServer,
  clearCartServer,
  validateCartServer,
  mergeGuestCartServer,
  refreshExpiryServer,
} from './services/cart-server';

// Guest Cart Utils
export type { AddToGuestCartResult } from './utils/guest-cart';
export {
  getGuestCart,
  getGuestCartCount,
  addToGuestCart,
  removeFromGuestCart,
  clearGuestCart,
  isInGuestCart,
  subscribe as subscribeGuestCart,
  STORAGE_KEY as GUEST_CART_STORAGE_KEY,
  MAX_GUEST_CART_ITEMS,
} from './utils/guest-cart';

// Guest Cart Hook
export { useGuestCart } from './hooks/use-guest-cart';

// Components
export { default as AddToCartButton } from './components/add-to-cart-button';
export { default as CartIcon } from './components/cart-icon';

// Cart Merge Hook
export { useCartMerge } from './hooks/use-cart-merge';

// Cart Query Hooks
export {
  useCart,
  useCartCount,
  useAddToCart,
  useRemoveFromCart,
  useClearCart,
  useValidateCart,
  useMergeGuestCart,
  useRefreshExpiry,
  useCartBadgeCount,
} from './hooks/use-cart';
