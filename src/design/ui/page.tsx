import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from 'lucide-react';
import { cn } from '../lib/cn';
import { Skeleton } from './feedback';

export type Crumb = { label: string; to?: string };
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-subtle" aria-hidden />}
            {c.to && i < items.length - 1 ? <Link to={c.to} className="truncate rounded px-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{c.label}</Link> : <span aria-current={i === items.length - 1 ? 'page' : undefined} className={cn('truncate', i === items.length - 1 && 'font-medium text-foreground')}>{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, description, actions, eyebrow, className }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; className?: string }) {
  return (
    <header className={cn('mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13px] text-muted-foreground">{eyebrow}</div>}
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.022em]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export type Delta = { value: string; tone?: 'good' | 'bad' | 'flat'; vs?: string };
/** A number with a label, and what it changed against. Links to the page that explains it. */
export function StatCard({ label, value, delta, to, loading, hint }: { label: string; value: ReactNode; delta?: Delta; to?: string; loading?: boolean; hint?: string }) {
  const Icon = delta?.tone === 'good' ? ArrowUpRight : delta?.tone === 'bad' ? ArrowDownRight : Minus;
  const body = (
    <>
      <p className="text-[13px] text-muted-foreground">{label}</p>
      {loading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-1 text-[26px] font-semibold leading-9 tabular-nums tracking-tight sm:text-3xl">{value ?? '—'}</p>}
      {!loading && delta && (
        <p className={cn('mt-1 flex items-center gap-1 text-xs tabular-nums', delta.tone === 'good' ? 'text-success-ink' : delta.tone === 'bad' ? 'text-danger-ink' : 'text-muted-foreground')}>
          <Icon className="size-3.5" aria-hidden />{delta.value}{delta.vs && <span className="text-muted-foreground"> {delta.vs}</span>}
        </p>
      )}
      {!loading && !delta && hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const base = 'block min-w-0 rounded-lg border border-border bg-card p-4 shadow-xs sm:p-5';
  return to
    ? <Link to={to} className={cn(base, 'transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>{body}</Link>
    : <div className={base}>{body}</div>;
}
