import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, type LucideIcon } from 'lucide-react';
import { cn } from './lib/cn';
import { Card, CardHeader, CardTitle } from './ui/card';

/** Things that need a person today, most urgent first. Only rows with a count show; an empty list says so. */
export interface AttentionItem { label: string; count: number; to: string; icon: LucideIcon; tone?: 'warning' | 'danger' | 'neutral' }
export function AttentionList({ items, title = 'Needs attention' }: { items: AttentionItem[]; title?: string }) {
  const open = items.filter((i) => i.count > 0);
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle>{open.length > 0 && <span className="text-[13px] tabular-nums text-muted-foreground">{open.length} open</span>}</CardHeader>
      {open.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-6 text-sm text-muted-foreground"><CheckCircle2 className="size-5 text-success-ink" aria-hidden />Nothing needs your attention right now.</div>
      ) : (
        <ul>
          {open.map((i) => (
            <li key={i.label} className="border-b border-border/70 last:border-0">
              <Link to={i.to} className="group flex min-h-12 items-center gap-3 px-5 py-2 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                <i.icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                <span className="line-clamp-2 flex-1 leading-snug">{i.label}</span>
                <span className={cn('rounded-full px-2 text-[13px] font-medium tabular-nums', i.tone === 'danger' ? 'bg-danger-soft text-danger-ink' : i.tone === 'neutral' ? 'bg-muted text-foreground' : 'bg-warning-soft text-warning-ink')}>{i.count}</span>
                <ArrowRight className="size-4 text-subtle transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** A share of a whole as a ranked list with thin bars (better than a donut for a few categories). */
export interface Share { label: string; value: number; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }
const bar = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', neutral: 'bg-border-strong' } as const;
export function ShareList({ items, total }: { items: Share[]; total?: number }) {
  const sum = total ?? items.reduce((a, b) => a + b.value, 0);
  return (
    <ul className="space-y-3">
      {items.map((i) => {
        const pct = sum ? (i.value / sum) * 100 : 0;
        return (
          <li key={i.label}>
            <div className="mb-1.5 flex items-baseline justify-between text-sm"><span>{i.label}</span><span className="tabular-nums text-muted-foreground"><span className="font-medium text-foreground">{i.value}</span> · {Math.round(pct)}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="presentation"><div className={cn('h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none', bar[i.tone ?? 'primary'])} style={{ width: `${pct}%` }} /></div>
          </li>
        );
      })}
    </ul>
  );
}

/** Label / value rows for a short summary inside a card. */
export function Facts({ rows }: { rows: { label: string; value: ReactNode; to?: string }[] }) {
  return (
    <dl className="divide-y divide-border/70 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="font-medium tabular-nums">{r.to ? <Link to={r.to} className="text-primary-ink hover:underline">{r.value}</Link> : r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A card whose header links to the page behind it. */
export function LinkCard({ title, to, linkLabel = 'View', children, className }: { title: string; to?: string; linkLabel?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {to && <Link to={to} className="inline-flex items-center gap-1 text-[13px] font-medium text-primary-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{linkLabel}<ArrowRight className="size-3.5" aria-hidden /></Link>}
      </CardHeader>
      <div className="p-5">{children}</div>
    </Card>
  );
}

/** Indian rupee amounts: full figure where there is room, a short form (₹2.75 Cr, ₹57.6 L, ₹12.4k) on narrow screens. */
export function compactRupees(n: number) {
  const a = Math.abs(n); const sign = n < 0 ? '−' : '';
  const f = (v: number, u: string) => `${sign}₹${(Math.round(v * 100) / 100).toString()}${u}`;
  if (a >= 1e7) return f(a / 1e7, ' Cr');
  if (a >= 1e5) return f(a / 1e5, ' L');
  if (a >= 1e4) return f(a / 1e3, 'k');
  return `${sign}₹${a.toLocaleString('en-IN')}`;
}
export function Money({ amount }: { amount: number }) {
  const full = `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  return <><span className="sm:hidden" aria-hidden>{compactRupees(amount)}</span><span className="hidden sm:inline">{full}</span><span className="sr-only sm:hidden">{full}</span></>;
}
