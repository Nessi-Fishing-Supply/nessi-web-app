/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MemberBadge from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('MemberBadge', () => {
  it('renders the badge name', () => {
    render(<MemberBadge name="Top Seller" icon="⭐" earned={true} />);
    expect(screen.getByText('Top Seller')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(<MemberBadge name="Fast Shipper" icon="🚀" earned={true} />);
    expect(screen.getByText('🚀')).toBeInTheDocument();
  });

  it('applies earned class when earned is true', () => {
    render(<MemberBadge name="Top Seller" icon="⭐" earned={true} />);
    const badge = screen.getByLabelText('Top Seller badge earned');
    expect(badge.className).toMatch(/earned/);
  });

  it('applies locked class when earned is false', () => {
    render(<MemberBadge name="Top Seller" icon="⭐" earned={false} />);
    const badge = screen.getByLabelText('Top Seller badge not yet earned');
    expect(badge.className).toMatch(/locked/);
  });

  it('sets correct aria-label for earned state', () => {
    render(<MemberBadge name="Power Angler" icon="🎣" earned={true} />);
    expect(screen.getByLabelText('Power Angler badge earned')).toBeInTheDocument();
  });

  it('sets correct aria-label for locked state', () => {
    render(<MemberBadge name="Power Angler" icon="🎣" earned={false} />);
    expect(screen.getByLabelText('Power Angler badge not yet earned')).toBeInTheDocument();
  });
});
