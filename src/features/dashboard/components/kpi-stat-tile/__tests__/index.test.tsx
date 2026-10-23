/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import KpiStatTile from '../index';

beforeEach(() => {
  cleanup();
});

describe('KpiStatTile', () => {
  it('renders the label and value', () => {
    render(
      <KpiStatTile
        label="Total Sales"
        value="$1,240"
        trend={{ direction: 'up', value: '+12%', period: 'vs last week' }}
      />,
    );
    expect(screen.getByText('Total Sales')).toBeInTheDocument();
    expect(screen.getByText('$1,240')).toBeInTheDocument();
  });

  it('renders trend value and period text', () => {
    render(
      <KpiStatTile
        label="Orders"
        value="34"
        trend={{ direction: 'up', value: '+12%', period: 'vs last week' }}
      />,
    );
    expect(screen.getByText('+12%')).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('applies trendUp class for up direction', () => {
    const { container } = render(
      <KpiStatTile
        label="Revenue"
        value="$500"
        trend={{ direction: 'up', value: '+5%', period: 'vs last month' }}
      />,
    );
    expect(container.querySelector('[class*="trendUp"]')).toBeInTheDocument();
  });

  it('applies trendDown class for down direction', () => {
    const { container } = render(
      <KpiStatTile
        label="Returns"
        value="3"
        trend={{ direction: 'down', value: '-2%', period: 'vs last month' }}
      />,
    );
    expect(container.querySelector('[class*="trendDown"]')).toBeInTheDocument();
  });

  it('applies trendFlat class for flat direction', () => {
    const { container } = render(
      <KpiStatTile
        label="Views"
        value="120"
        trend={{ direction: 'flat', value: '0%', period: 'vs last week' }}
      />,
    );
    expect(container.querySelector('[class*="trendFlat"]')).toBeInTheDocument();
  });
});
