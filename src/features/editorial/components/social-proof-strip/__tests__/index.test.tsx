/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SocialProofStrip from '../index';

beforeEach(() => {
  cleanup();
});

describe('SocialProofStrip — stats variant', () => {
  it('renders stat values and labels', () => {
    render(
      <SocialProofStrip
        variant="stats"
        stats={[
          { label: 'Listings', value: '12,400' },
          { label: 'Members', value: '3,200' },
        ]}
      />,
    );
    expect(screen.getByText('12,400')).toBeInTheDocument();
    expect(screen.getByText('Listings')).toBeInTheDocument();
    expect(screen.getByText('3,200')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
  });

  it('renders null when variant is stats but no stats prop provided', () => {
    const { container } = render(<SocialProofStrip variant="stats" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('SocialProofStrip — activity variant', () => {
  const activity = {
    userName: 'fisher_dan',
    location: 'Denver, CO',
    itemName: 'Orvis Helios 3D',
    price: 49900,
    timeAgo: '2m ago',
  };

  it('renders the activity username and item name', () => {
    render(<SocialProofStrip variant="activity" activity={activity} />);
    expect(screen.getByText('fisher_dan')).toBeInTheDocument();
    expect(screen.getByText('Orvis Helios 3D')).toBeInTheDocument();
  });

  it('renders the formatted price in the activity strip', () => {
    render(<SocialProofStrip variant="activity" activity={activity} />);
    expect(screen.getByText('$499.00')).toBeInTheDocument();
  });

  it('has aria-live="polite" on the activity strip', () => {
    const { container } = render(<SocialProofStrip variant="activity" activity={activity} />);
    expect(container.firstChild).toHaveAttribute('aria-live', 'polite');
  });
});
