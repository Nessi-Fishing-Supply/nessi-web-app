/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ProgressBar from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('ProgressBar', () => {
  it('sets correct aria attributes on the progressbar role', () => {
    render(<ProgressBar value={3} max={10} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
  });

  it('clamps value below 0 to 0', () => {
    render(<ProgressBar value={-5} max={10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('clamps value above max to max', () => {
    render(<ProgressBar value={15} max={10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
  });

  it('shows percentage text when showPercentage is true', () => {
    render(<ProgressBar value={1} max={4} showPercentage />);
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('renders the label and links it to the progressbar via aria-labelledby', () => {
    render(<ProgressBar value={2} max={5} label="Upload progress" />);
    const label = screen.getByText('Upload progress');
    expect(label).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-labelledby', label.id);
  });
});
