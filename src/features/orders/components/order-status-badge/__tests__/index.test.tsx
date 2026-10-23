/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import OrderStatusBadge from '../index';

beforeEach(() => {
  cleanup();
});

describe('OrderStatusBadge', () => {
  it('renders "Paid" for paid status', () => {
    render(<OrderStatusBadge status="paid" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('renders "Shipped" for shipped status', () => {
    render(<OrderStatusBadge status="shipped" />);
    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });

  it('renders "Delivered" for delivered status', () => {
    render(<OrderStatusBadge status="delivered" />);
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('renders "Verification" for verification status', () => {
    render(<OrderStatusBadge status="verification" />);
    expect(screen.getByText('Verification')).toBeInTheDocument();
  });

  it('renders "Released" for released status', () => {
    render(<OrderStatusBadge status="released" />);
    expect(screen.getByText('Released')).toBeInTheDocument();
  });

  it('renders "Disputed" for disputed status', () => {
    render(<OrderStatusBadge status="disputed" />);
    expect(screen.getByText('Disputed')).toBeInTheDocument();
  });

  it('renders "Refunded" for refunded status', () => {
    render(<OrderStatusBadge status="refunded" />);
    expect(screen.getByText('Refunded')).toBeInTheDocument();
  });

  it('forwards className prop', () => {
    const { container } = render(<OrderStatusBadge status="paid" className="custom-badge" />);
    expect(container.firstChild).toHaveClass('custom-badge');
  });
});
