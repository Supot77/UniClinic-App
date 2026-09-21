import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsContent from '@/components/settings/SettingsContent';

describe('SettingsContent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.fontSize;
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it('stores theme and text size preferences', async () => {
    render(<SettingsContent />);
    await waitFor(() => expect(screen.getByRole('button', { name: /มืด/ })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /มืด/ }));
    fireEvent.click(screen.getByRole('button', { name: /ใหญ่/ }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.fontSize).toBe('large');
    expect(window.localStorage.getItem('wu-clinic-theme')).toBe('dark');
    expect(window.localStorage.getItem('wu-clinic-font-size')).toBe('large');
  });
});
