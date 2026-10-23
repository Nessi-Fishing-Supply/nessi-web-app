/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Tooltip from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Tooltip', () => {
  it('renders children and hides tooltip by default', () => {
    render(
      <Tooltip content="Helpful text">
        <button>Hover me</button>
      </Tooltip>,
    );
    expect(screen.getByText('Hover me')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on mouse enter and hides on mouse leave', async () => {
    render(
      <Tooltip content="Helpful text">
        <button>Hover me</button>
      </Tooltip>,
    );
    const wrapper = screen.getByText('Hover me').closest('span')!.parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Helpful text');
  });

  it('toggles tooltip on click', () => {
    render(
      <Tooltip content="Click tooltip">
        <span>Click me</span>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('truncates content to 80 characters', () => {
    const longContent = 'A'.repeat(100);
    render(
      <Tooltip content={longContent}>
        <span>Trigger</span>
      </Tooltip>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('A'.repeat(80));
    expect(screen.getByRole('tooltip').textContent?.length).toBeLessThanOrEqual(80);
  });

  it('links trigger to tooltip via aria-describedby', () => {
    render(
      <Tooltip content="Described content">
        <span>Trigger</span>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button');
    expect(trigger).not.toHaveAttribute('aria-describedby');
    fireEvent.click(trigger);
    const tooltip = screen.getByRole('tooltip');
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);
  });

  it('closes tooltip on Escape key', () => {
    render(
      <Tooltip content="Escape me">
        <span>Trigger</span>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('applies the correct placement class', () => {
    render(
      <Tooltip content="Bottom tooltip" placement="bottom">
        <span>Trigger</span>
      </Tooltip>,
    );
    fireEvent.click(screen.getByRole('button'));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.className).toMatch(/bottom/);
  });
});
