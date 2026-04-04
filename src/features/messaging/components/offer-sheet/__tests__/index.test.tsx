/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { Offer } from '@/features/messaging/types/offer';
import OfferSheet from '../index';

// Capture the onSuccess callback passed to useCreateOffer
let capturedOnSuccess: ((offer: Offer) => void) | undefined;

vi.mock('@/features/messaging/hooks/use-create-offer', () => ({
  useCreateOffer: vi.fn((opts?: { onSuccess?: (offer: Offer) => void }) => {
    capturedOnSuccess = opts?.onSuccess;
    return { mutate: vi.fn(), isPending: false };
  }),
}));

vi.mock('@/features/messaging/hooks/use-offer-actions', () => ({
  useOfferActions: vi.fn(() => ({
    accept: { mutate: vi.fn(), isPending: false },
    decline: { mutate: vi.fn(), isPending: false },
    counter: { mutate: vi.fn(), isPending: false },
  })),
}));

vi.mock('@/components/indicators/toast/context', () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}));

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  listingId: 'listing-123',
  listingTitle: 'Test Rod',
  listingPriceCents: 10000,
  sellerId: 'seller-456',
  mode: 'create' as const,
};

const fakeOffer: Offer = {
  id: 'offer-abc',
  thread_id: 'thread-xyz',
  listing_id: 'listing-123',
  buyer_id: 'buyer-789',
  seller_id: 'seller-456',
  amount_cents: 8000,
  status: 'pending',
  parent_offer_id: null,
  expires_at: new Date(Date.now() + 86400000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => {
  capturedOnSuccess = undefined;
  vi.clearAllMocks();

  // Modal uses ReactDOM.createPortal — provide the required mount point
  const existing = document.getElementById('modal-root');
  if (!existing) {
    const modalRoot = document.createElement('div');
    modalRoot.setAttribute('id', 'modal-root');
    document.body.appendChild(modalRoot);
  }

  cleanup();
});

describe('OfferSheet — onOfferCreated callback', () => {
  it('calls onOfferCreated with { thread_id } when an offer is successfully created', () => {
    const onOfferCreated = vi.fn();

    render(<OfferSheet {...baseProps} onOfferCreated={onOfferCreated} />);

    // Simulate the mutation's onSuccess firing with the fake offer
    expect(capturedOnSuccess).toBeDefined();
    capturedOnSuccess!(fakeOffer);

    expect(onOfferCreated).toHaveBeenCalledTimes(1);
    expect(onOfferCreated).toHaveBeenCalledWith({ thread_id: 'thread-xyz' });
  });

  it('does not call onOfferCreated when the prop is omitted', () => {
    const onOfferCreated = vi.fn();

    // Render without the onOfferCreated prop
    render(<OfferSheet {...baseProps} />);

    expect(capturedOnSuccess).toBeDefined();
    // Should not throw and onOfferCreated spy should never be called
    capturedOnSuccess!(fakeOffer);

    expect(onOfferCreated).not.toHaveBeenCalled();
  });

  it('passes the exact thread_id from the offer to onOfferCreated', () => {
    const onOfferCreated = vi.fn();
    const specificThreadId = 'specific-thread-id-999';
    const offerWithSpecificThread: Offer = { ...fakeOffer, thread_id: specificThreadId };

    render(<OfferSheet {...baseProps} onOfferCreated={onOfferCreated} />);

    capturedOnSuccess!(offerWithSpecificThread);

    expect(onOfferCreated).toHaveBeenCalledWith({ thread_id: specificThreadId });
  });
});
