/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import NotificationRow from '../index';

const baseProps = {
  type: 'sale' as const,
  title: 'Your rod sold!',
  description: 'G. Loomis IMX-PRO sold for $320',
  timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  isRead: false,
};

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('NotificationRow', () => {
  it('renders title and description', () => {
    render(<NotificationRow {...baseProps} />);
    expect(screen.getByText('Your rod sold!')).toBeInTheDocument();
    expect(screen.getByText('G. Loomis IMX-PRO sold for $320')).toBeInTheDocument();
  });

  it('renders the unread dot when isRead is false', () => {
    const { container } = render(<NotificationRow {...baseProps} isRead={false} />);
    const dot = container.querySelector('[class*="dot"]');
    expect(dot).toBeInTheDocument();
  });

  it('does not render the unread dot when isRead is true', () => {
    const { container } = render(<NotificationRow {...baseProps} isRead={true} />);
    const dot = container.querySelector('[class*="dot"]');
    expect(dot).not.toBeInTheDocument();
  });

  it('calls onClick when the row is clicked', () => {
    const onClick = vi.fn();
    render(<NotificationRow {...baseProps} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders as a button element for row-level tap', () => {
    render(<NotificationRow {...baseProps} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('formats recent timestamps as relative time', () => {
    render(<NotificationRow {...baseProps} />);
    // 5 minutes ago should show "5m ago"
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });
});
