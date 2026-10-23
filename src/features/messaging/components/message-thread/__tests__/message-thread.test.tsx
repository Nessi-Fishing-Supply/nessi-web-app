/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MessageThread from '../index';
import type { MessageWithSender } from '../index';

const SELLER_ID = 'seller-1';
const BUYER_ID = 'buyer-1';

function makeOfferMessage(
  overrides: Partial<{ id: string; status: string; senderId: string }>,
): MessageWithSender {
  return {
    id: overrides.id ?? 'msg-1',
    thread_id: 'thread-1',
    sender_id: overrides.senderId ?? BUYER_ID,
    type: 'offer_node',
    content: null,
    metadata: {
      amount_cents: 5000,
      original_price_cents: 10000,
      status: overrides.status ?? 'pending',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    },
    is_filtered: false,
    original_content: null,
    edited_at: null,
    created_at: new Date().toISOString(),
    sender: {
      id: overrides.senderId ?? BUYER_ID,
      first_name: 'Test',
      last_name: 'Buyer',
      avatar_url: null,
    },
  };
}

beforeEach(() => {
  cleanup();
});

describe('MessageThread — offer action prop forwarding', () => {
  it('seller sees Accept, Counter, and Decline buttons on the latest pending offer', () => {
    const message = makeOfferMessage({ id: 'msg-offer-1', status: 'pending' });
    render(
      <MessageThread
        messages={[message]}
        currentUserId={SELLER_ID}
        currentUserRole="seller"
        latestPendingOfferId="msg-offer-1"
        onAcceptOffer={vi.fn()}
        onCounterOffer={vi.fn()}
        onDeclineOffer={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /counter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decline offer/i })).toBeInTheDocument();
  });

  it('buyer does not see action buttons on a pending offer', () => {
    const message = makeOfferMessage({ id: 'msg-offer-1', status: 'pending' });
    render(
      <MessageThread
        messages={[message]}
        currentUserId={BUYER_ID}
        currentUserRole="buyer"
        latestPendingOfferId="msg-offer-1"
        onAcceptOffer={vi.fn()}
        onCounterOffer={vi.fn()}
        onDeclineOffer={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /counter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /decline offer/i })).not.toBeInTheDocument();
  });

  it('seller does not see action buttons when offer status is accepted', () => {
    const message = makeOfferMessage({ id: 'msg-offer-1', status: 'accepted' });
    render(
      <MessageThread
        messages={[message]}
        currentUserId={SELLER_ID}
        currentUserRole="seller"
        latestPendingOfferId="msg-offer-1"
        onAcceptOffer={vi.fn()}
        onCounterOffer={vi.fn()}
        onDeclineOffer={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /counter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /decline offer/i })).not.toBeInTheDocument();
  });

  it('seller does not see action buttons when message ID does not match latestPendingOfferId', () => {
    const message = makeOfferMessage({ id: 'msg-offer-1', status: 'pending' });
    render(
      <MessageThread
        messages={[message]}
        currentUserId={SELLER_ID}
        currentUserRole="seller"
        latestPendingOfferId="msg-offer-different"
        onAcceptOffer={vi.fn()}
        onCounterOffer={vi.fn()}
        onDeclineOffer={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /counter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /decline offer/i })).not.toBeInTheDocument();
  });
});
