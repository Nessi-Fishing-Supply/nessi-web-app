/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import RecentlySoldTicker from '../index';

const sales = [
  { title: 'Shimano Baitrunner', price: 12999, thumbnail: '/baitrunner.webp', timeAgo: '1m ago' },
  { title: 'Orvis Battenkill', price: 24900, thumbnail: '/battenkill.webp', timeAgo: '5m ago' },
  { title: 'Penn Senator', price: 8900, thumbnail: '/senator.webp', timeAgo: '12m ago' },
];

beforeEach(() => {
  cleanup();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RecentlySoldTicker', () => {
  it('renders the "Recently Sold" header', () => {
    render(<RecentlySoldTicker sales={sales} />);
    expect(screen.getByText('Recently Sold')).toBeInTheDocument();
  });

  it('renders all sale item titles in the DOM', () => {
    render(<RecentlySoldTicker sales={sales} />);
    expect(screen.getByText('Shimano Baitrunner')).toBeInTheDocument();
    expect(screen.getByText('Orvis Battenkill')).toBeInTheDocument();
    expect(screen.getByText('Penn Senator')).toBeInTheDocument();
  });

  it('renders formatted price for the first item', () => {
    render(<RecentlySoldTicker sales={sales} />);
    expect(screen.getByText('$129.99')).toBeInTheDocument();
  });

  it('advances to the next item after 4 seconds', () => {
    render(<RecentlySoldTicker sales={sales} />);
    // Initially the first row is visible (activeIndex=0)
    const firstRow = screen.getByText('Shimano Baitrunner').closest('[aria-hidden]');
    expect(firstRow).toHaveAttribute('aria-hidden', 'false');

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // After 4s, second row should be visible
    const secondRow = screen.getByText('Orvis Battenkill').closest('[aria-hidden]');
    expect(secondRow).toHaveAttribute('aria-hidden', 'false');
  });

  it('renders without crashing when sales array is empty', () => {
    const { container } = render(<RecentlySoldTicker sales={[]} />);
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Recently Sold')).toBeInTheDocument();
  });
});
