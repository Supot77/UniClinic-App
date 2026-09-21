import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsContent from '@/components/settings/SettingsContent';

function mockMatchMedia(matches: boolean) {
  const matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });

  vi.stubGlobal('matchMedia', matchMedia);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: matchMedia,
  });
}

describe('SettingsContent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.fontSize;
    mockMatchMedia(false);
  });

  it('loads saved light theme and text size preferences', async () => {
    window.localStorage.setItem('wu-clinic-theme', 'light');
    window.localStorage.setItem('wu-clinic-font-size', 'large');

    render(<SettingsContent />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light');
      expect(document.documentElement.dataset.fontSize).toBe('large');
    });
  });

  it('stores light, dark, and system themes and reapplies them after refresh', async () => {
    mockMatchMedia(true);

    const { unmount } = render(<SettingsContent />);
    await waitFor(() => expect(screen.getByRole('button', { name: /มืด/ })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /สว่าง/ }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('wu-clinic-theme')).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: /มืด/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('wu-clinic-theme')).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: /ตามอุปกรณ์/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('wu-clinic-theme')).toBe('system');

    fireEvent.click(screen.getByRole('button', { name: /ใหญ่/ }));
    expect(document.documentElement.dataset.fontSize).toBe('large');
    expect(window.localStorage.getItem('wu-clinic-font-size')).toBe('large');

    unmount();
    delete document.documentElement.dataset.theme;
    render(<SettingsContent />);

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(document.documentElement.dataset.fontSize).toBe('large');
  });
});
