/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import LocationChip from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('LocationChip', () => {
  it('renders the location text', () => {
    render(<LocationChip location="Portland, OR" />);
    expect(screen.getByText('Portland, OR')).toBeInTheDocument();
  });

  it('defaults to inline variant when no variant is provided', () => {
    const { container } = render(<LocationChip location="Seattle, WA" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/inline/);
  });

  it('applies pill variant class when variant is pill', () => {
    const { container } = render(<LocationChip location="Bend, OR" variant="pill" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/pill/);
  });

  it('applies pickup variant class when variant is pickup', () => {
    const { container } = render(<LocationChip location="Local pickup" variant="pickup" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/pickup/);
  });

  it('forwards className to the root element', () => {
    const { container } = render(<LocationChip location="Eugene, OR" className="extra" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('extra');
  });
});
