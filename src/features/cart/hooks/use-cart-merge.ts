'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/context';
import { getGuestCart } from '@/features/cart/utils/guest-cart';
import { useMergeGuestCart } from '@/features/cart/hooks/use-cart';
import { useToast } from '@/components/indicators/toast/context';

export function useCartMerge(): void {
  const { user } = useAuth();
  const prevUserRef = useRef(user);
  const { mutate: mergeGuestCart } = useMergeGuestCart();
  const { showToast } = useToast();

  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (prevUser !== null || user === null) return;

    const guestItems = getGuestCart();
    if (guestItems.length === 0) return;

    const guestCount = guestItems.length;

    mergeGuestCart(guestItems, {
      onSuccess: ({ merged }) => {
        if (merged === guestCount) {
          showToast({
            message: 'Cart merged',
            description: `${merged} item${merged === 1 ? '' : 's'} from your guest cart ${merged === 1 ? 'was' : 'were'} added.`,
            type: 'success',
          });
        } else if (merged > 0) {
          const unavailable = guestCount - merged;
          showToast({
            message: 'Cart partially merged',
            description: `${merged} item${merged === 1 ? '' : 's'} added, ${unavailable} item${unavailable === 1 ? '' : 's'} no longer available.`,
            type: 'success',
          });
        } else {
          showToast({
            message: 'Cart items unavailable',
            description: 'Items in your guest cart are no longer available.',
            type: 'error',
          });
        }
      },
      onError: () => {
        showToast({
          message: 'Could not merge your guest cart',
          description: 'Please try adding items again.',
          type: 'error',
        });
      },
    });
  }, [user, mergeGuestCart, showToast]);
}
