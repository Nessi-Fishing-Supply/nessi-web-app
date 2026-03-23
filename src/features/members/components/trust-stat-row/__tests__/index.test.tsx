/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import TrustStatRow from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('TrustStatRow', () => {
  const defaultProps = {
    sellerName: 'Jane Fisher',
    rating: 4.5,
    salesCount: 37,
    responseTime: '< 1 hour',
    joinedDate: 'March 2023',
  };

  it('renders the seller name', () => {
    render(<TrustStatRow {...defaultProps} />);
    expect(screen.getByText('Jane Fisher')).toBeInTheDocument();
  });

  it('renders all three stats with their values', () => {
    render(<TrustStatRow {...defaultProps} />);
    expect(screen.getByText('< 1 hour')).toBeInTheDocument();
    expect(screen.getByText('March 2023')).toBeInTheDocument();
    expect(screen.getByText('37')).toBeInTheDocument();
  });

  it('renders stat labels', () => {
    render(<TrustStatRow {...defaultProps} />);
    expect(screen.getByText('Response time')).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
  });

  it('fires onMessage when message button is clicked', () => {
    const onMessage = vi.fn();
    render(<TrustStatRow {...defaultProps} onMessage={onMessage} />);
    const btn = screen.getByRole('button', { name: /message jane fisher/i });
    fireEvent.click(btn);
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('does not render message button when onMessage is not provided', () => {
    render(<TrustStatRow {...defaultProps} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders star rating accessible label', () => {
    render(<TrustStatRow {...defaultProps} rating={4.5} />);
    expect(screen.getByLabelText('4.5 out of 5 stars')).toBeInTheDocument();
  });

  it('renders avatar with seller name', () => {
    render(<TrustStatRow {...defaultProps} />);
    // Avatar renders a span with role=img and aria-label matching the name
    expect(screen.getByRole('img', { name: 'Jane Fisher' })).toBeInTheDocument();
  });
});
