import { useSyncExternalStore } from 'react';

/** Which groups of School settings have unsaved changes: the side menu shows a dot beside each. Shared between the page and the menu. */
let dirty: string[] = [];
const subs = new Set<() => void>();
export function setDirtyGroups(next: string[]) {
  if (next.join('|') === dirty.join('|')) return; // keep the same array while nothing changed, so nothing redraws
  dirty = next; subs.forEach((f) => f());
}
export const useDirtyGroups = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => dirty);

/**
 * The unsaved edits themselves. They live here, not in the page, because the page is drawn again whenever the address changes (a new group); holding
 * them here is what lets someone move between groups without losing a change. `base` says which saved settings the edits were made on.
 */
type Draft = { base: string; value: Record<string, unknown> } | null;
let draft: Draft = null;
export function setDraft(next: Draft) { draft = next; subs.forEach((f) => f()); }
export const useDraft = (): Draft => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => draft);
