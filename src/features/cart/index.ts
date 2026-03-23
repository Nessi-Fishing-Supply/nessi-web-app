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
