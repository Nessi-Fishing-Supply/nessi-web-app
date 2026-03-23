/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Tabs, { type TabItem } from '../index';

const items: TabItem[] = [
  { label: 'Listings', count: 5 },
  { label: 'Reviews' },
  { label: 'About' },
];

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Tabs', () => {
  it('renders all tab labels', () => {
    render(<Tabs items={items} activeIndex={0} onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /listings/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /reviews/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /about/i })).toBeInTheDocument();
  });

  it('marks the active tab with aria-selected="true"', () => {
    render(<Tabs items={items} activeIndex={1} onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /reviews/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /listings/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('calls onChange with the correct index when a tab is clicked', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} activeIndex={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /about/i }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('renders count in parentheses when provided', () => {
    render(<Tabs items={items} activeIndex={0} onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /listings/i })).toHaveTextContent('(5)');
    expect(screen.getByRole('tab', { name: /reviews/i }).textContent).not.toContain('(');
  });

  it('navigates right with ArrowRight key', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} activeIndex={0} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: /listings/i }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('navigates left with ArrowLeft key and wraps around', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} activeIndex={0} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: /listings/i }), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('has a tablist container', () => {
    render(<Tabs items={items} activeIndex={0} onChange={vi.fn()} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
