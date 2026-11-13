import { useCallback, useSyncExternalStore } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
const KEY = 'erp.theme';

/**
 * One store for the whole app, so the header toggle, the account menu and the sign-in page always agree.
 * No saved choice means "follow the device": the first visit matches the system, and later system changes are followed too.
 */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const readChoice = (): ThemeChoice => {
  try { const v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark') return v; } catch { /* storage unavailable (private mode) */ }
  return 'system';
};
const systemDark = () => !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const resolve = (c: ThemeChoice): ResolvedTheme => (c === 'system' ? (systemDark() ? 'dark' : 'light') : c);

let choice: ThemeChoice = typeof window === 'undefined' ? 'system' : readChoice();
let settle: ReturnType<typeof setTimeout> | undefined;

/** Paint the theme on <html>. `animate` adds a short-lived class that fades colours instead of snapping. */
export function applyTheme(c: ThemeChoice = choice, animate = false) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-switching');
    clearTimeout(settle);
    settle = setTimeout(() => root.classList.remove('theme-switching'), 350);
  }
  root.dataset.theme = resolve(c);
}

export function setThemeChoice(c: ThemeChoice) {
  choice = c;
  try { if (c === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, c); } catch { /* ignore */ }
  applyTheme(c, true);
  emit();
}

if (typeof window !== 'undefined') {
  // follow the device while the user has not picked a side
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => { if (choice === 'system') { applyTheme('system', true); emit(); } });
  // another tab changed the theme
  window.addEventListener('storage', (e) => { if (e.key === KEY) { choice = readChoice(); applyTheme(choice, true); emit(); } });
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const snapshot = () => `${choice}|${resolve(choice)}`;

export function useTheme() {
  const [c, r] = useSyncExternalStore(subscribe, snapshot, () => 'system|light').split('|') as [ThemeChoice, ResolvedTheme];
  const toggle = useCallback(() => setThemeChoice(resolve(choice) === 'dark' ? 'light' : 'dark'), []);
  return { theme: c, resolved: r, setTheme: setThemeChoice, toggle };
}
