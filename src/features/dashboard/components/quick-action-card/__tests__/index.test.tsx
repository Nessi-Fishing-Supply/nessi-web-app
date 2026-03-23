/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import QuickActionCard from '../index';

beforeEach(() => {
  cleanup();
});

const icon = <svg data-testid="test-icon" />;

describe('QuickActionCard', () => {
  it('renders the label', () => {
    render(<QuickActionCard icon={icon} label="New Listing" href="/dashboard/listings/new" />);
    expect(screen.getByText('New Listing')).toBeInTheDocument();
  });

  it('renders as a link with the correct href', () => {
    render(<QuickActionCard icon={icon} label="Messages" href="/dashboard/messages" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/dashboard/messages');
  });

  it('shows badge when badge prop is a positive number', () => {
    render(<QuickActionCard icon={icon} label="Orders" href="/dashboard/orders" badge={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render badge when badge is 0', () => {
    render(<QuickActionCard icon={icon} label="Orders" href="/dashboard/orders" badge={0} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('caps badge display at 99+ for large values', () => {
    render(
      <QuickActionCard
        icon={icon}
        label="Notifications"
        href="/dashboard/notifications"
        badge={150}
      />,
    );
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('renders optional subtitle when provided', () => {
    render(
      <QuickActionCard
        icon={icon}
        label="Listings"
        href="/dashboard/listings"
        subtitle="3 active"
      />,
    );
    expect(screen.getByText('3 active')).toBeInTheDocument();
  });
});
