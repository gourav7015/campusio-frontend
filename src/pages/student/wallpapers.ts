import { useCallback, useSyncExternalStore } from 'react';

/**
 * Student dashboard wallpapers. A wallpaper only changes the welcome card; the school's branding, the theme and the
 * accessibility settings are untouched. Each scene fixes its own text colour so the name stays readable on it.
 * The choice is a per-viewer convenience, kept in localStorage.
 */
export interface Scene { id: string; label: string; art: 'none' | 'orbs' | 'hills' | 'grid' | 'stars'; light: Tone; dark: Tone }
interface Tone { bg: string; ink: string; sub: string; chip: string }

export const SCENES: Scene[] = [
  { id: 'minimal', label: 'Minimal', art: 'none', light: { bg: 'rgb(255 255 255)', ink: 'rgb(29 29 31)', sub: 'rgb(104 104 109)', chip: 'rgb(240 240 242)' }, dark: { bg: 'rgb(34 34 36)', ink: 'rgb(245 245 247)', sub: 'rgb(152 152 157)', chip: 'rgb(44 44 46)' } },
  { id: 'soft-blue', label: 'Soft blue', art: 'orbs', light: { bg: 'linear-gradient(135deg, rgb(232 242 253), rgb(246 250 255))', ink: 'rgb(29 29 31)', sub: 'rgb(70 76 88)', chip: 'rgb(255 255 255 / .7)' }, dark: { bg: 'linear-gradient(135deg, rgb(16 42 74), rgb(24 28 44))', ink: 'rgb(245 245 247)', sub: 'rgb(190 200 218)', chip: 'rgb(255 255 255 / .1)' } },
  { id: 'midnight', label: 'Midnight', art: 'stars', light: { bg: 'linear-gradient(135deg, rgb(24 28 52), rgb(44 50 88))', ink: 'rgb(245 245 247)', sub: 'rgb(200 205 225)', chip: 'rgb(255 255 255 / .12)' }, dark: { bg: 'linear-gradient(135deg, rgb(12 14 28), rgb(30 34 64))', ink: 'rgb(245 245 247)', sub: 'rgb(190 196 220)', chip: 'rgb(255 255 255 / .1)' } },
  { id: 'nature', label: 'Nature', art: 'hills', light: { bg: 'linear-gradient(160deg, rgb(226 241 230), rgb(246 249 240))', ink: 'rgb(29 29 31)', sub: 'rgb(58 76 62)', chip: 'rgb(255 255 255 / .7)' }, dark: { bg: 'linear-gradient(160deg, rgb(20 46 34), rgb(24 32 28))', ink: 'rgb(245 245 247)', sub: 'rgb(186 208 194)', chip: 'rgb(255 255 255 / .1)' } },
  { id: 'focus', label: 'Study focus', art: 'grid', light: { bg: 'rgb(246 242 234)', ink: 'rgb(29 29 31)', sub: 'rgb(84 78 68)', chip: 'rgb(255 255 255 / .7)' }, dark: { bg: 'rgb(36 34 30)', ink: 'rgb(245 245 247)', sub: 'rgb(200 194 182)', chip: 'rgb(255 255 255 / .1)' } },
];

const KEY = 'erp.student.wallpaper';
const listeners = new Set<() => void>();
const read = () => { try { const v = localStorage.getItem(KEY); if (v && SCENES.some((s) => s.id === v)) return v; } catch { /* storage unavailable */ } return 'minimal'; };
let current = typeof window === 'undefined' ? 'minimal' : read();

export function useWallpaper() {
  const id = useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => current, () => 'minimal');
  const set = useCallback((next: string) => { current = next; try { localStorage.setItem(KEY, next); } catch { /* ignore */ } listeners.forEach((l) => l()); }, []);
  return { scene: SCENES.find((s) => s.id === id) ?? SCENES[0], set };
}
