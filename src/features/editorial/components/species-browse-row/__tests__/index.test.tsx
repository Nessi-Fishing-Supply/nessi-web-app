/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import SpeciesBrowseRow, { type SpeciesItem } from '../index';

const species: SpeciesItem[] = [
  { id: 'bass', name: 'Bass', emoji: '🐟', isActive: false },
  { id: 'trout', name: 'Trout', emoji: '🎣', isActive: true },
  { id: 'salmon', name: 'Salmon', emoji: '🐠', isActive: false },
];

beforeEach(() => {
  cleanup();
});

describe('SpeciesBrowseRow', () => {
  it('renders all species items as buttons', () => {
    render(<SpeciesBrowseRow species={species} onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('renders species names', () => {
    render(<SpeciesBrowseRow species={species} onSelect={vi.fn()} />);
    expect(screen.getByText('Bass')).toBeInTheDocument();
    expect(screen.getByText('Trout')).toBeInTheDocument();
    expect(screen.getByText('Salmon')).toBeInTheDocument();
  });

  it('marks active species with aria-pressed="true"', () => {
    render(<SpeciesBrowseRow species={species} onSelect={vi.fn()} />);
    const troutBtn = screen.getByRole('button', { name: /trout/i });
    expect(troutBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks inactive species with aria-pressed="false"', () => {
    render(<SpeciesBrowseRow species={species} onSelect={vi.fn()} />);
    const bassBtn = screen.getByRole('button', { name: /bass/i });
    expect(bassBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelect with the correct id when a button is clicked', () => {
    const onSelect = vi.fn();
    render(<SpeciesBrowseRow species={species} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /salmon/i }));
    expect(onSelect).toHaveBeenCalledWith('salmon');
  });
});
