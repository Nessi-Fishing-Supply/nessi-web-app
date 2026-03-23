/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import OrderTimeline, { type TimelineStep } from '../index';

const steps: TimelineStep[] = [
  {
    label: 'Order Placed',
    description: 'Your order has been received.',
    timestamp: new Date('2025-05-01T09:00:00Z'),
  },
  {
    label: 'Payment Confirmed',
    description: 'Payment processed successfully.',
    timestamp: new Date('2025-05-01T09:30:00Z'),
  },
  {
    label: 'Shipped',
    description: 'Your item is on its way.',
  },
  {
    label: 'Delivered',
  },
];

beforeEach(() => {
  cleanup();
});

describe('OrderTimeline', () => {
  it('renders all step labels', () => {
    render(<OrderTimeline steps={steps} currentStep={1} />);
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('Payment Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('applies completed class to steps before currentStep', () => {
    const { container } = render(<OrderTimeline steps={steps} currentStep={2} />);
    const stepItems = container.querySelectorAll('li');
    // Steps 0 and 1 are completed (index < 2)
    expect(stepItems[0].className).toMatch(/completed/);
    expect(stepItems[1].className).toMatch(/completed/);
  });

  it('applies active class only to the currentStep', () => {
    const { container } = render(<OrderTimeline steps={steps} currentStep={2} />);
    const stepItems = container.querySelectorAll('li');
    expect(stepItems[2].className).toMatch(/active/);
    expect(stepItems[0].className).not.toMatch(/active/);
    expect(stepItems[3].className).not.toMatch(/active/);
  });

  it('applies pending class to steps after currentStep', () => {
    const { container } = render(<OrderTimeline steps={steps} currentStep={2} />);
    const stepItems = container.querySelectorAll('li');
    expect(stepItems[3].className).toMatch(/pending/);
  });

  it('renders the checkmark icon for completed steps', () => {
    const { container } = render(<OrderTimeline steps={steps} currentStep={2} />);
    // HiCheck renders as an SVG inside completed circles
    const completedItems = container.querySelectorAll('li[class*="completed"]');
    completedItems.forEach((item) => {
      expect(item.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('renders timestamps for completed steps that have a timestamp', () => {
    render(<OrderTimeline steps={steps} currentStep={2} />);
    const timestamps = screen.getAllByRole('time');
    // Steps 0 and 1 are completed and both have timestamps
    expect(timestamps).toHaveLength(2);
    expect(timestamps[0]).toHaveAttribute('dateTime', '2025-05-01T09:00:00.000Z');
    expect(timestamps[1]).toHaveAttribute('dateTime', '2025-05-01T09:30:00.000Z');
  });

  it('renders step descriptions when provided', () => {
    render(<OrderTimeline steps={steps} currentStep={1} />);
    expect(screen.getByText('Your order has been received.')).toBeInTheDocument();
    expect(screen.getByText('Payment processed successfully.')).toBeInTheDocument();
    expect(screen.getByText('Your item is on its way.')).toBeInTheDocument();
  });

  it('applies optional className to the root element', () => {
    const { container } = render(
      <OrderTimeline steps={steps} currentStep={0} className="extra-class" />,
    );
    expect(container.firstChild).toHaveClass('extra-class');
  });
});
