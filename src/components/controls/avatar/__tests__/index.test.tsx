/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Avatar from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Avatar', () => {
  it('renders initials for a name with no imageUrl', () => {
    render(<Avatar name="Alex Holloway" />);
    const avatar = screen.getByLabelText('Alex Holloway');
    expect(avatar).toBeInTheDocument();
    expect(avatar.textContent).toContain('AH');
  });

  it('renders single-word name as first two characters', () => {
    render(<Avatar name="Alex" />);
    expect(screen.getByLabelText('Alex').textContent).toContain('AL');
  });

  it('renders an img element when imageUrl is provided', () => {
    render(<Avatar name="Alex Holloway" imageUrl="https://example.com/avatar.webp" />);
    const img = screen.getByAltText('Alex Holloway');
    expect(img).toBeInTheDocument();
    expect(img.tagName).toBe('IMG');
  });

  it('applies shop ring class when isShop is true', () => {
    render(<Avatar name="My Shop" isShop />);
    const avatar = screen.getByLabelText('My Shop');
    expect(avatar.className).toMatch(/shop/);
  });

  it('does not apply shop ring class when isShop is false', () => {
    render(<Avatar name="Regular User" />);
    const avatar = screen.getByLabelText('Regular User');
    expect(avatar.className).not.toMatch(/shop/);
  });

  it('sets width and height inline style according to size prop', () => {
    const { rerender } = render(<Avatar name="Test" size="xs" />);
    expect(screen.getByLabelText('Test')).toHaveStyle({ width: '24px', height: '24px' });

    rerender(<Avatar name="Test" size="lg" />);
    expect(screen.getByLabelText('Test')).toHaveStyle({ width: '48px', height: '48px' });
  });
});
