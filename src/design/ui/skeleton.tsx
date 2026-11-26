import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Loading skeletons, look "Pencil" (styles in index.css). The rules, for every screen:
 * - Real words stay real: titles, tabs, column headings and buttons are drawn by the page; only the data under them is a shape.
 * - The shape matches the finished page, so nothing jumps when the data arrives. No made-up names or numbers.
 * - It fades in after 0.2 s (a fast load never flashes), is hidden from a screen reader except one "Loading",
 *   holds still when the person has reduced motion, and says "Still loading" after 8 seconds.
 */
type Kind = 'line' | 'small' | 'title' | 'block' | 'circle' | 'pill' | 'bar';
const KIND: Record<Kind, string> = { line: 'sk-line', small: 'sk-line sk-small', title: 'sk-line sk-title', block: 'rounded-md', circle: 'rounded-full', pill: 'rounded-full', bar: 'sk-bar rounded-t' };

/** One shape. `d` is its place in the order things are drawn (0, 1, 2 …), so a screen is drawn top to bottom. */
export function Sk({ kind = 'block', w, h, d = 0, className, style }: { kind?: Kind; w?: number | string; h?: number | string; d?: number; className?: string; style?: CSSProperties }) {
  return <i aria-hidden className={cn('sk', KIND[kind], className)} style={{ width: w, height: h, ['--d' as string]: d, ...style }} />;
}

const card = 'rounded-lg border border-border/70 bg-card p-4 shadow-xs';

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  const [long, setLong] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLong(true), 8000); return () => clearTimeout(t); }, []);
  return (
    <div role="status" aria-label="Loading" className={cn('sk-scene', className)}>
      {children}
      {long && <p className="mt-4 text-center text-sm text-muted-foreground">Still loading. Check your connection.</p>}
    </div>
  );
}

const Cell = ({ d, children }: { d: number; children: ReactNode }) => <div className={card} style={{ ['--d' as string]: d }}>{children}</div>;

/** Home pages: a heading, four number cards, a chart and a short list. */
function Dashboard() {
  return (
    <Frame className="space-y-6">
      <div className="space-y-2"><Sk kind="title" w={220} /><Sk kind="line" w={320} className="max-w-full" d={1} /></div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Cell key={i} d={i + 1}><Sk kind="small" w="55%" /><Sk kind="title" w="48%" className="mt-3" d={i + 1} /><Sk kind="small" w="75%" className="mt-3" d={i + 2} /></Cell>)}</div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className={card}><Sk kind="small" w={150} /><div className="mt-4 flex h-24 items-end gap-1.5">{[55, 70, 62, 84, 76, 90, 68, 80, 72].map((p, i) => <Sk key={i} kind="bar" d={i} className="flex-1" h={`${p}%`} />)}</div></div>
        <div className={card}><Sk kind="small" w={90} /><div className="mt-4 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-2"><Sk kind="circle" w={18} h={18} d={i} /><Sk kind="line" d={i} className="flex-1" /></div>)}</div></div>
      </div>
    </Frame>
  );
}

/** A table: filter fields, then rows the same height as real rows. Past eight rows the rest stay still. */
function Table({ rows = 8 }: { rows?: number }) {
  return (
    <Frame className="space-y-4">
      <div className="flex flex-wrap gap-2"><Sk kind="block" w={120} h={36} className="rounded-lg" /><Sk kind="block" w={120} h={36} className="rounded-lg" d={1} /><Sk kind="block" h={36} className="min-w-40 flex-1 rounded-lg" d={2} /></div>
      <div className={cn(card, 'p-0')}>{Array.from({ length: Math.min(rows, 12) }).map((_, i) => (
        <div key={i} className={cn('flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0', i >= 8 && 'sk-still')}>
          <Sk kind="circle" w={28} h={28} d={Math.min(i, 8)} /><Sk kind="line" w={`${[34, 26, 40, 30][i % 4]}%`} d={Math.min(i, 8)} /><span className="flex-1" /><Sk kind="line" w="14%" d={Math.min(i, 8)} className="hidden sm:block" /><Sk kind="pill" w={56} h={20} d={Math.min(i, 8)} />
        </div>))}</div>
    </Frame>
  );
}

/** Rows inside a card the page already drew: the plain, most common case. */
function List({ rows = 5 }: { rows?: number }) {
  return (
    <Frame className="space-y-4 p-5">{Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3"><div className="min-w-0 flex-1 space-y-2"><Sk kind="line" w={`${[44, 62, 36, 54, 48][i % 5]}%`} d={i} /><Sk kind="small" w={`${[70, 52, 64, 46, 58][i % 5]}%`} d={i + 1} /></div><Sk kind="pill" w={52} h={18} d={i} /></div>))}</Frame>
  );
}

/** Card grids: books, houses, buses, classes. */
function Cards({ count = 8 }: { count?: number }) {
  return (
    <Frame><div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: count }).map((_, i) => (
      <div key={i} className={cn(card, 'p-3')}><Sk kind="block" h={84} className="w-full rounded-lg" d={i % 4} /><Sk kind="line" w="80%" className="mt-3" d={(i % 4) + 1} /><Sk kind="small" w="55%" className="mt-3" d={(i % 4) + 2} /></div>))}</div></Frame>
  );
}

/** A person, a bus or an account: the header card, then the facts. */
function Profile() {
  return (
    <Frame className="space-y-4">
      <div className={cn(card, 'flex items-center gap-4')}><Sk kind="circle" w={56} h={56} /><div className="min-w-0 flex-1 space-y-2"><Sk kind="title" w={160} d={1} /><Sk kind="line" w={220} className="max-w-full" d={2} /></div><div className="space-y-2"><Sk kind="pill" w={60} h={18} d={1} /><Sk kind="pill" w={48} h={18} d={2} /></div></div>
      <div className={cn(card, 'grid gap-x-6 gap-y-5 sm:grid-cols-2')}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="space-y-2"><Sk kind="small" w="36%" d={i} /><Sk kind="line" w={`${[70, 50, 80, 62, 56, 44][i]}%`} d={i + 1} /></div>)}</div>
    </Frame>
  );
}

/** Forms and settings: a label and a field, again and again. */
function Form({ fields = 6 }: { fields?: number }) {
  return (
    <Frame><div className={cn(card, 'grid gap-5 sm:grid-cols-2')}>{Array.from({ length: fields }).map((_, i) => <div key={i} className="space-y-2"><Sk kind="small" w="34%" d={i} /><Sk kind="block" h={40} className="w-full rounded-lg" d={i + 1} /></div>)}</div></Frame>
  );
}

/** An attendance register: the tools bar, then a row for each student. */
function Roster({ rows = 8 }: { rows?: number }) {
  return (
    <Frame className="space-y-3">
      <div className="flex flex-wrap gap-2"><Sk kind="pill" w={64} h={28} /><Sk kind="pill" w={84} h={28} d={1} /><Sk kind="pill" w={84} h={28} d={2} /><Sk kind="block" h={28} className="min-w-32 flex-1 rounded-lg" d={3} /></div>
      <div className={cn(card, 'p-0')}>{Array.from({ length: Math.min(rows, 12) }).map((_, i) => (
        <div key={i} className={cn('flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0', i >= 8 && 'sk-still')}>
          <Sk kind="small" w={18} d={Math.min(i, 8)} /><Sk kind="line" w={`${[30, 22, 36, 26][i % 4]}%`} d={Math.min(i, 8)} /><span className="flex-1" />{[44, 44, 34].map((w, j) => <Sk key={j} kind="pill" w={w} h={24} d={Math.min(i, 8)} />)}
        </div>))}</div>
    </Frame>
  );
}

/** Opening the app, before the menu is known. */
function Boot() {
  return (
    <Frame className="grid min-h-[60vh] place-items-center"><div className="flex flex-col items-center gap-4"><Sk kind="block" w={48} h={48} className="rounded-xl" /><Sk kind="line" w={150} d={1} /><Sk kind="small" w={100} d={2} /></div></Frame>
  );
}

export type SkeletonKind = 'dashboard' | 'table' | 'list' | 'cards' | 'profile' | 'form' | 'roster' | 'boot';
const SCENES: Record<SkeletonKind, (p: object) => ReactNode> = { dashboard: Dashboard, table: Table, list: List, cards: Cards, profile: Profile, form: Form, roster: Roster, boot: Boot };

/** The loading screen for a kind of page. */
export function SkeletonScene({ kind = 'list' }: { kind?: SkeletonKind }) {
  const Scene = SCENES[kind] ?? List;
  return <Scene {...{}} />;
}
export { Table as SkeletonTable };
