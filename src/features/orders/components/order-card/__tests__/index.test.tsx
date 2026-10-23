/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import OrderCard from '../index';
import type { OrderWithListing } from '@/features/orders/types/order';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    return <img data-fill={fill ? 'true' : undefined} {...rest} />;
  },
}));

function createMockOrder(overrides: Partial<OrderWithListing> = {}): OrderWithListing {
  return {
    id: 'order-1',
    listing_id: 'listing-1',
    buyer_id: 'buyer-1',
    seller_id: 'seller-1',
    buyer_email: 'buyer@test.com',
    amount_cents: 2500,
    nessi_fee_cents: 150,
    shipping_cost_cents: 0,
    shipping_address: {},
    stripe_payment_intent_id: 'pi_test',
    status: 'paid',
    escrow_status: 'held',
    carrier: null,
    tracking_number: null,
    shipped_at: null,
    delivered_at: null,
    buyer_accepted_at: null,
    verification_deadline: null,
    released_at: null,
    created_at: '2026-03-15T10:00:00Z',
    updated_at: '2026-03-15T10:00:00Z',
    listing: {
      title: 'Shimano Stradic FL 2500',
      cover_photo_url: 'https://example.com/photo.webp',
    },
    buyer: {
      first_name: 'Jane',
      last_name: 'Doe',
      avatar_url: null,
    },
    seller: {
      first_name: 'John',
      last_name: 'Smith',
      avatar_url: null,
      stripe_account_id: 'acct_test',
    },
    ...overrides,
  } as OrderWithListing;
}

beforeEach(() => {
  cleanup();
});

describe('OrderCard', () => {
  it('renders listing title', () => {
    render(<OrderCard order={createMockOrder()} />);
    expect(screen.getByText('Shimano Stradic FL 2500')).toBeInTheDocument();
  });

  it('renders seller full name', () => {
    render(<OrderCard order={createMockOrder()} />);
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('renders formatted date', () => {
    render(<OrderCard order={createMockOrder()} />);
    expect(screen.getByText('Mar 15, 2026')).toBeInTheDocument();
  });

  it('renders formatted price via formatPrice', () => {
    render(<OrderCard order={createMockOrder({ amount_cents: 2500 })} />);
    expect(screen.getByText('$25.00')).toBeInTheDocument();
  });

  it('renders OrderStatusBadge with correct status text', () => {
    render(<OrderCard order={createMockOrder({ status: 'shipped' })} />);
    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });

  it('renders thumbnail image with sizes="80px"', () => {
    render(<OrderCard order={createMockOrder()} />);
    const img = screen.getByAltText('Shimano Stradic FL 2500');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('sizes', '80px');
  });

  it('renders placeholder when cover_photo_url is null', () => {
    const order = createMockOrder({
      listing: { title: 'No Photo Item', cover_photo_url: null },
    });
    render(<OrderCard order={order} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('has aria-pressed false by default', () => {
    render(<OrderCard order={createMockOrder()} />);
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  it('has aria-pressed true when isSelected is true', () => {
    render(<OrderCard order={createMockOrder()} isSelected />);
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  it('aria-label contains the listing title', () => {
    render(<OrderCard order={createMockOrder()} />);
    const card = screen.getByRole('button');
    expect(card.getAttribute('aria-label')).toContain('Shimano Stradic FL 2500');
  });

  it('calls onSelect callback when clicked', () => {
    const onSelect = vi.fn();
    render(<OrderCard order={createMockOrder()} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('does not throw when clicked with no onSelect provided', () => {
    render(<OrderCard order={createMockOrder()} />);
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
  });

  it('applies selected CSS class when isSelected is true', () => {
    const { container } = render(<OrderCard order={createMockOrder()} isSelected />);
    expect((container.firstChild as HTMLElement).className).toContain('selected');
  });
});
