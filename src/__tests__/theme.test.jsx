import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const media = (dark) => vi.fn().mockImplementation((q) => ({ matches: dark && q.includes('dark'), media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }));

async function load(dark, saved) {
  vi.resetModules();
  localStorage.clear();
  if (saved) localStorage.setItem('erp.theme', saved);
  window.matchMedia = media(dark);
  document.documentElement.removeAttribute('data-theme');
  const theme = await import('../design/lib/theme.ts');
  const ui = await import('../design/ui/theme-toggle.tsx');
  return { theme, ...ui };
}

describe('theme', () => {
  beforeEach(() => { document.documentElement.className = ''; });

  it('first visit follows the device and stores nothing', async () => {
    const { theme } = await load(true);
    theme.applyTheme();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('erp.theme')).toBeNull();
  });

  it('a saved choice beats the device', async () => {
    const { theme } = await load(true, 'light');
    theme.applyTheme();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('the toggle switches, saves, labels itself for what it will do, and fades colours', async () => {
    const { ThemeToggle } = await load(false);
    render(<ThemeToggle tooltip={false} />);
    const btn = screen.getByRole('button', { name: 'Switch to dark mode' });
    fireEvent.click(btn);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('erp.theme')).toBe('dark');
    expect(document.documentElement.classList.contains('theme-switching')).toBe(true);
    expect(await screen.findByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(localStorage.getItem('erp.theme')).toBe('light');
  });

  it('choosing "match device" forgets the saved choice', async () => {
    const { theme } = await load(true, 'light');
    theme.setThemeChoice('system');
    expect(localStorage.getItem('erp.theme')).toBeNull();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});

describe('attendance streak', () => {
  it('counts recorded present or late school days back from the latest, ignoring unrecorded days and stopping at an absence', async () => {
    const { streakOf } = await import('../pages/student/StudentDashboard.tsx');
    const d = (status, working = true) => ({ date: 'x', status, working });
    expect(streakOf([d('absent'), d('present'), d(null), d('late'), d('present', false), d('present')])).toBe(3);
    expect(streakOf([d('present'), d('absent')])).toBe(0);
    expect(streakOf(undefined)).toBe(0);
  });
});
