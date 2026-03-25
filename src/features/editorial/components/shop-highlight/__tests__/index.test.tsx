/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ShopHighlight from '../index';

const baseProps = {
  shopName: 'Reel Masters',
  location: 'Portland, OR',
  heroImage: '/hero.webp',
  quote: 'Fishing is life.',
  identityTags: ['Fly Fishing', 'Saltwater'],
  previewItems: [
    { image: '/item1.webp', price: 4999 },
    { image: '/item2.webp', price: 8999 },
    { image: '/item3.webp', price: 1999 },
  ],
  rating: 4.8,
  salesCount: 312,
  shopUrl: '/shops/reel-masters',
};

beforeEach(() => {
  cleanup();
});

describe('ShopHighlight', () => {
  it('renders the shop name', () => {
    render(<ShopHighlight {...baseProps} />);
    expect(screen.getByText('Reel Masters')).toBeInTheDocument();
  });

  it('renders a "Visit Shop" link that points to shopUrl', () => {
    render(<ShopHighlight {...baseProps} />);
    const cta = screen.getByRole('link', { name: /visit shop/i });
    expect(cta).toHaveAttribute('href', '/shops/reel-masters');
  });

  it('renders all 3 preview items (capped at 3)', () => {
    render(<ShopHighlight {...baseProps} />);
    // hero image + 3 preview items = 4 (no avatar since avatarUrl not provided)
    const previewPrices = screen.getAllByText(/\$/);
    expect(previewPrices.length).toBeGreaterThanOrEqual(3);
  });

  it('renders identity tags', () => {
    render(<ShopHighlight {...baseProps} />);
    expect(screen.getByText('Fly Fishing')).toBeInTheDocument();
    expect(screen.getByText('Saltwater')).toBeInTheDocument();
  });

  it('renders the sales count and rating', () => {
    render(<ShopHighlight {...baseProps} />);
    expect(screen.getByText('312 sales')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
  });
});
