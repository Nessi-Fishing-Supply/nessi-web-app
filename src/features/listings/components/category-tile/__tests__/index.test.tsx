/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import CategoryTile from '../index';

beforeEach(() => {
  cleanup();
});

describe('CategoryTile', () => {
  it('renders a link with the correct href', () => {
    render(<CategoryTile name="Rods" image="/rods.jpg" href="/category/rods" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/category/rods');
  });

  it('renders an image with alt text matching the name', () => {
    render(<CategoryTile name="Reels" image="/reels.jpg" href="/category/reels" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Reels');
  });

  it('renders the category label text', () => {
    render(<CategoryTile name="Tackle" image="/tackle.jpg" href="/category/tackle" />);
    expect(screen.getByText('Tackle')).toBeInTheDocument();
  });

  it('applies an additional className when provided', () => {
    const { container } = render(
      <CategoryTile name="Lures" image="/lures.jpg" href="/category/lures" className="extra" />,
    );
    expect(container.firstChild).toHaveClass('extra');
  });

  it('passes the image src prop correctly', () => {
    render(<CategoryTile name="Flies" image="/flies.webp" href="/category/flies" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/flies.webp');
  });
});
