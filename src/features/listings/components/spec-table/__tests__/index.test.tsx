/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SpecTable from '../index';

beforeEach(() => {
  cleanup();
});

describe('SpecTable', () => {
  it('renders spec keys and values', () => {
    render(
      <SpecTable
        specs={[
          { key: 'Brand', value: 'Shimano' },
          { key: 'Model', value: 'Stradic' },
        ]}
      />,
    );
    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByText('Shimano')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('Stradic')).toBeInTheDocument();
  });

  it('uses semantic dl/dt/dd markup', () => {
    const { container } = render(<SpecTable specs={[{ key: 'Weight', value: '8 oz' }]} />);
    expect(container.querySelector('dl')).toBeInTheDocument();
    expect(container.querySelector('dt')).toBeInTheDocument();
    expect(container.querySelector('dd')).toBeInTheDocument();
  });

  it('filters out specs with empty values', () => {
    render(
      <SpecTable
        specs={[
          { key: 'Brand', value: 'Daiwa' },
          { key: 'Model', value: '' },
          { key: 'Color', value: '   ' },
        ]}
      />,
    );
    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.queryByText('Model')).not.toBeInTheDocument();
    expect(screen.queryByText('Color')).not.toBeInTheDocument();
  });

  it('returns null when all spec values are empty', () => {
    const { container } = render(<SpecTable specs={[{ key: 'Brand', value: '' }]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null for an empty specs array', () => {
    const { container } = render(<SpecTable specs={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
