/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import BottomSheet from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
  // Ensure a portal target exists in the document
  if (!document.getElementById('modal-root')) {
    const el = document.createElement('div');
    el.id = 'modal-root';
    document.body.appendChild(el);
  }
});

describe('BottomSheet', () => {
  it('renders the title when open', () => {
    render(
      <BottomSheet title="Filter Results" isOpen onClose={vi.fn()}>
        <p>Content</p>
      </BottomSheet>,
    );
    expect(screen.getByRole('dialog', { name: /filter results/i })).toBeInTheDocument();
  });

  it('renders children inside the sheet', () => {
    render(
      <BottomSheet title="Sort" isOpen onClose={vi.fn()}>
        <p>Sort options here</p>
      </BottomSheet>,
    );
    expect(screen.getByText('Sort options here')).toBeInTheDocument();
  });

  it('calls onClose when the scrim is clicked', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet title="Test" isOpen onClose={onClose}>
        <p>Content</p>
      </BottomSheet>,
    );
    // The scrim is the direct parent of the dialog
    const dialog = screen.getByRole('dialog');
    const scrim = dialog.parentElement!;
    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet title="Test" isOpen onClose={onClose}>
        <p>Content</p>
      </BottomSheet>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the CTA button and fires its handler when clicked', () => {
    const onCtaClick = vi.fn();
    render(
      <BottomSheet
        title="Confirm"
        isOpen
        onClose={vi.fn()}
        cta={{ label: 'Apply Filters', onClick: onCtaClick }}
      >
        <p>Content</p>
      </BottomSheet>,
    );
    const ctaButton = screen.getByRole('button', { name: /apply filters/i });
    expect(ctaButton).toBeInTheDocument();
    fireEvent.click(ctaButton);
    expect(onCtaClick).toHaveBeenCalledTimes(1);
  });
});
