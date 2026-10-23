/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import PriceDisplay from '../index';

beforeEach(() => {
  cleanup();
});

describe('PriceDisplay', () => {
  it('renders formatted price in standard variant with "or offer" text', () => {
    render(<PriceDisplay price={2999} />);
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText('or offer')).toBeInTheDocument();
  });

  it('renders below-avg label in below-avg variant', () => {
    render(<PriceDisplay price={1500} variant="below-avg" />);
    expect(screen.getByText('below avg resale')).toBeInTheDocument();
    expect(screen.queryByText('or offer')).not.toBeInTheDocument();
  });

  it('renders strikethrough original price and drop badge in price-drop variant', () => {
    render(<PriceDisplay price={1999} originalPrice={2999} variant="price-drop" />);
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    const badge = screen.getByLabelText(/% price drop/);
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/-\d+%/);
  });

  it('renders watcher count with singular/plural label', () => {
    const { rerender } = render(<PriceDisplay price={999} watcherCount={1} />);
    expect(screen.getByText(/1 watcher$/)).toBeInTheDocument();

    rerender(<PriceDisplay price={999} watcherCount={5} />);
    expect(screen.getByText(/5 watchers/)).toBeInTheDocument();
  });

  it('does not render watcher row when watcherCount is 0 or undefined', () => {
    const { rerender } = render(<PriceDisplay price={999} watcherCount={0} />);
    expect(screen.queryByText(/watcher/)).not.toBeInTheDocument();

    rerender(<PriceDisplay price={999} />);
    expect(screen.queryByText(/watcher/)).not.toBeInTheDocument();
  });
});
