/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MakerStoryBlock from '../index';

const baseProps = {
  quote: 'Every cast tells a story.',
  author: 'Jane Doe',
  shopName: 'Handcrafted Rods',
  image: '/maker.webp',
  narrative: 'Jane has been crafting rods for over 20 years.',
  ctaLabel: 'Shop Now',
  ctaHref: '/shops/handcrafted-rods',
};

beforeEach(() => {
  cleanup();
});

describe('MakerStoryBlock', () => {
  it('renders the pull quote text', () => {
    render(<MakerStoryBlock {...baseProps} />);
    expect(screen.getByText('Every cast tells a story.')).toBeInTheDocument();
  });

  it('renders the author cite with shop name', () => {
    render(<MakerStoryBlock {...baseProps} />);
    // Author text is inside a cite element alongside the shop name span
    const cite = document.querySelector('cite');
    expect(cite?.textContent).toContain('Jane Doe');
    expect(screen.getByText('Handcrafted Rods')).toBeInTheDocument();
  });

  it('renders a CTA link that points to ctaHref', () => {
    render(<MakerStoryBlock {...baseProps} />);
    const cta = screen.getByRole('link', { name: 'Shop Now' });
    expect(cta).toHaveAttribute('href', '/shops/handcrafted-rods');
  });

  it('renders the narrative paragraph', () => {
    render(<MakerStoryBlock {...baseProps} />);
    expect(screen.getByText('Jane has been crafting rods for over 20 years.')).toBeInTheDocument();
  });

  it('renders the image caption when provided', () => {
    render(<MakerStoryBlock {...baseProps} imageCaption="Jane in her workshop" />);
    expect(screen.getByText('Jane in her workshop')).toBeInTheDocument();
  });
});
