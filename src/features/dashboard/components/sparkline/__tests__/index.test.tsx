/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import Sparkline from '../index';

beforeEach(() => {
  cleanup();
});

describe('Sparkline', () => {
  it('renders an SVG element for valid data', () => {
    const { container } = render(<Sparkline data={[10, 20, 15, 30, 25]} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders polyline and polygon area shapes', () => {
    const { container } = render(<Sparkline data={[5, 10, 8, 15, 12]} />);
    expect(container.querySelector('polyline')).toBeInTheDocument();
    expect(container.querySelector('polygon')).toBeInTheDocument();
  });

  it('returns null for empty data', () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('returns null for a single data point', () => {
    const { container } = render(<Sparkline data={[42]} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('uses the provided color on the polyline stroke', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} color="#FF5733" />);
    const polyline = container.querySelector('polyline');
    expect(polyline).toHaveAttribute('stroke', '#FF5733');
  });

  it('respects custom width and height via viewBox', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} width={200} height={50} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 200 50');
  });
});
