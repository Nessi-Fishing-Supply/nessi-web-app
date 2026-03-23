/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ShippingRateCard from '../index';

const baseProps = {
  carrier: 'USPS',
  service: 'Priority Mail',
  price: 799,
  eta: '2-3 days',
  isSelected: false,
};

beforeEach(() => {
  cleanup();
});

describe('ShippingRateCard', () => {
  it('renders carrier, service, eta, and formatted price', () => {
    render(<ShippingRateCard {...baseProps} />);
    expect(screen.getByText('USPS')).toBeInTheDocument();
    expect(screen.getByText('Priority Mail')).toBeInTheDocument();
    expect(screen.getByText('2-3 days')).toBeInTheDocument();
    expect(screen.getByText('$7.99')).toBeInTheDocument();
  });

  it('has aria-pressed=false when unselected', () => {
    render(<ShippingRateCard {...baseProps} isSelected={false} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('has aria-pressed=true and shows checkmark when selected', () => {
    render(<ShippingRateCard {...baseProps} isSelected />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    // checkmark icon is rendered (aria-hidden, but the svg element exists)
    const { container } = render(<ShippingRateCard {...baseProps} isSelected />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('displays "Free" text in place of price when isFree', () => {
    render(<ShippingRateCard {...baseProps} isFree />);
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.queryByText('$7.99')).not.toBeInTheDocument();
  });

  it('calls onSelect when the button is clicked', () => {
    const onSelect = vi.fn();
    render(<ShippingRateCard {...baseProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
