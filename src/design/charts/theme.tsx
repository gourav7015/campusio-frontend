import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { cn } from '../lib/cn';

/** Chart colours come from tokens, so charts follow light/dark and never invent a hue. One series leads, the rest stay neutral. */
export const chartColor = {
  primary: 'rgb(var(--c-primary))', success: 'rgb(var(--c-success))', warning: 'rgb(var(--c-warning))', danger: 'rgb(var(--c-danger))',
  grid: 'rgb(var(--c-border))', axis: 'rgb(var(--c-fg-2))', neutral: 'rgb(var(--c-border-strong))', navy: 'rgb(var(--c-navy))',
} as const;

export const axisProps = { tickLine: false, axisLine: false, tick: { fill: chartColor.axis, fontSize: 12 }, tickMargin: 8 } as const;
export const gridProps = { stroke: chartColor.grid, strokeDasharray: '3 4', vertical: false } as const;

/** Recharts animates on mount; turn it off for people who ask for less motion. */
export const useChartMotion = () => { const reduce = useReducedMotion(); return { isAnimationActive: !reduce, animationDuration: 700, animationEasing: 'ease-out' as const }; };

type Row = { name?: string | number; value?: number | string; color?: string; dataKey?: string | number };
export function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: Row[]; label?: ReactNode; format?: (v: number | string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      {label != null && <div className="mb-1 font-medium text-foreground">{label}</div>}
      {payload.map((p, i) => (
        <div key={`${p.dataKey}-${i}`} className="flex items-center gap-2 tabular-nums">
          <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto pl-4 font-medium text-foreground">{format ? format(p.value ?? '') : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Card for a chart: title, what it measures, optional link to the page behind it. */
export function ChartCard({ title, description, to, linkLabel = 'View details', actions, children, className, height = 260 }: { title: string; description?: string; to?: string; linkLabel?: string; actions?: ReactNode; children: ReactNode; className?: string; height?: number }) {
  return (
    <Card className={className}>
      <CardHeader className="items-start">
        <div className="min-w-0"><CardTitle>{title}</CardTitle>{description && <CardDescription className="mt-0.5">{description}</CardDescription>}</div>
        <div className="flex items-center gap-2">
          {actions}
          {to && <Link to={to} className={cn('inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-medium text-primary-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>{linkLabel}<ArrowRight className="size-3.5" aria-hidden /></Link>}
        </div>
      </CardHeader>
      <div className="p-4 pt-5" style={{ height }}>{children}</div>
    </Card>
  );
}
