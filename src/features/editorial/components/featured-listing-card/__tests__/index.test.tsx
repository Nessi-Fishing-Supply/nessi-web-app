/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import FeaturedListingCard from '../index';

const baseProps = {
  title: 'Shimano Stradic FL 2500',
  price: 19999,
  sellerName: 'tackle_king',
  image: '/reel.webp',
  conditionLabel: 'Like New',
  conditionVariant: 'LikeNew',
  href: '/listing/abc123',
};

beforeEach(() => {
  cleanup();
});

describe('FeaturedListingCard', () => {
  it('renders the listing title', () => {
    render(<FeaturedListingCard {...baseProps} />);
    expect(screen.getByText('Shimano Stradic FL 2500')).toBeInTheDocument();
  });

  it('renders the formatted price', () => {
    render(<FeaturedListingCard {...baseProps} />);
    expect(screen.getByText('$199.99')).toBeInTheDocument();
  });

  it('links to the listing href', () => {
    render(<FeaturedListingCard {...baseProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/listing/abc123');
  });

  it('calls onWatch when watchlist button is clicked', () => {
    const onWatch = vi.fn();
    render(<FeaturedListingCard {...baseProps} onWatch={onWatch} />);
    const btn = screen.getByRole('button', { name: /add to watchlist/i });
    fireEvent.click(btn);
    expect(onWatch).toHaveBeenCalledTimes(1);
  });

  it('reflects watched state via aria-pressed when isWatched is true', () => {
    const onWatch = vi.fn();
    render(<FeaturedListingCard {...baseProps} onWatch={onWatch} isWatched />);
    const btn = screen.getByRole('button', { name: /remove from watchlist/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });
});
