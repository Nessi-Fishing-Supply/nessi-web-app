/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ShopUpgradePrompt from '../index';

beforeEach(() => {
  cleanup();
});

describe('ShopUpgradePrompt', () => {
  it('renders the serif headline "Open Your Shop"', () => {
    render(
      <ShopUpgradePrompt
        listingCount={5}
        totalSales={12}
        onUpgrade={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: /open your shop/i })).toBeInTheDocument();
  });

  it('renders the "Upgrade Available" pill', () => {
    render(
      <ShopUpgradePrompt
        listingCount={5}
        totalSales={12}
        onUpgrade={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText('Upgrade Available')).toBeInTheDocument();
  });

  it('calls onUpgrade when "Open My Shop" button is clicked', () => {
    const onUpgrade = vi.fn();
    render(
      <ShopUpgradePrompt
        listingCount={5}
        totalSales={12}
        onUpgrade={onUpgrade}
        onDismiss={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /open my shop/i }));
    expect(onUpgrade).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when "Later" button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <ShopUpgradePrompt
        listingCount={5}
        totalSales={12}
        onUpgrade={vi.fn()}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /later/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('displays listing and sales counts in the subtext', () => {
    render(
      <ShopUpgradePrompt listingCount={3} totalSales={7} onUpgrade={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(screen.getByText(/3 listing/i)).toBeInTheDocument();
    expect(screen.getByText(/7 sale/i)).toBeInTheDocument();
  });
});
