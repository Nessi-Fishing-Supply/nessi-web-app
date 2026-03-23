/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SettingsRow from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('SettingsRow', () => {
  describe('nav type', () => {
    it('renders as a button with the label', () => {
      render(<SettingsRow type="nav" label="Edit Profile" onClick={vi.fn()} />);
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(<SettingsRow type="nav" label="Edit Profile" onClick={onClick} />);
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('shows value text when provided', () => {
      render(<SettingsRow type="nav" label="Language" value="English" onClick={vi.fn()} />);
      expect(screen.getByText('English')).toBeInTheDocument();
    });
  });

  describe('toggle type', () => {
    it('renders a switch with correct role and aria-checked when off', () => {
      render(
        <SettingsRow type="toggle" label="Push Notifications" checked={false} onChange={vi.fn()} />,
      );
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('renders a switch with aria-checked="true" when on', () => {
      render(
        <SettingsRow type="toggle" label="Push Notifications" checked={true} onChange={vi.fn()} />,
      );
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('calls onChange with toggled value when switch is clicked', () => {
      const onChange = vi.fn();
      render(
        <SettingsRow type="toggle" label="Email Alerts" checked={false} onChange={onChange} />,
      );
      fireEvent.click(screen.getByRole('switch'));
      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe('display type', () => {
    it('renders label and value text', () => {
      render(<SettingsRow type="display" label="Member Since" value="March 2024" />);
      expect(screen.getByText('Member Since')).toBeInTheDocument();
      expect(screen.getByText('March 2024')).toBeInTheDocument();
    });
  });
});
