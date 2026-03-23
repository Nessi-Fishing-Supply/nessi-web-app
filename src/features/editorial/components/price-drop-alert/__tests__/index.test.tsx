/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import PriceDropAlert from '../index';

beforeEach(() => {
  cleanup();
});

describe('PriceDropAlert — banner variant', () => {
  it('renders "Price dropped!" heading', () => {
    render(
      <PriceDropAlert
        variant="banner"
        itemName="G. Loomis NRX"
        oldPrice={49900}
        newPrice={39900}
      />,
    );
    expect(screen.getByText('Price dropped!')).toBeInTheDocument();
  });

  it('renders old and new formatted prices', () => {
    render(
      <PriceDropAlert
        variant="banner"
        itemName="G. Loomis NRX"
        oldPrice={49900}
        newPrice={39900}
      />,
    );
    expect(screen.getByText('$499.00')).toBeInTheDocument();
    expect(screen.getByText('$399.00')).toBeInTheDocument();
  });

  it('renders the correct drop percentage badge', () => {
    render(
      <PriceDropAlert
        variant="banner"
        itemName="G. Loomis NRX"
        oldPrice={50000}
        newPrice={40000}
      />,
    );
    expect(screen.getByText('-20%')).toBeInTheDocument();
  });
});

describe('PriceDropAlert — saved-row variant', () => {
  it('renders item name in saved-row', () => {
    render(
      <PriceDropAlert
        variant="saved-row"
        itemName="Penn Battle III"
        oldPrice={20000}
        newPrice={14900}
      />,
    );
    expect(screen.getByText('Penn Battle III')).toBeInTheDocument();
  });

  it('renders drop percentage pill in saved-row', () => {
    render(
      <PriceDropAlert
        variant="saved-row"
        itemName="Penn Battle III"
        oldPrice={20000}
        newPrice={14900}
      />,
    );
    expect(screen.getByText('-26%')).toBeInTheDocument();
  });
});
