/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PageHeader from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('PageHeader', () => {
  it('renders the back button and fires onBack when clicked', () => {
    const onBack = vi.fn();
    render(<PageHeader onBack={onBack} />);
    const button = screen.getByRole('button', { name: /go back/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the title when provided', () => {
    render(<PageHeader onBack={vi.fn()} title="My Listing" />);
    expect(screen.getByRole('heading', { name: /my listing/i })).toBeInTheDocument();
  });

  it('does not render a heading when title is omitted', () => {
    render(<PageHeader onBack={vi.fn()} />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders the actions slot when provided', () => {
    render(<PageHeader onBack={vi.fn()} actions={<button>Save</button>} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('applies an additional className to the header element', () => {
    const { container } = render(<PageHeader onBack={vi.fn()} className="extra" />);
    expect(container.querySelector('header')).toHaveClass('extra');
  });
});
