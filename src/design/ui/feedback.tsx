import type { HTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, Inbox, RotateCw, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { ErrorScreen, isConnectionProblem } from '../ErrorScreen';

export const Skeleton = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('animate-pulse rounded-md bg-muted motion-reduce:animate-none', className)} aria-hidden {...p} />;

/** Page-level loading placeholder shaped like content (a heading, a stat row and a table). */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-80 max-w-full" /></div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: { icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-4 grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon className="size-5" aria-hidden /></div>
      <p className="text-[15px] font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  if (isConnectionProblem(error)) return <ErrorScreen inline error={error} onRetry={onRetry} />;
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Something went wrong';
  const message = /Failed to fetch|NetworkError|Load failed/i.test(raw) ? 'We cannot reach the server. Check your internet connection and try again.' : raw;
  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-4 grid size-11 place-items-center rounded-xl bg-danger-soft text-danger-ink"><AlertTriangle className="size-5" aria-hidden /></div>
      <p className="text-[15px] font-semibold">We could not load this</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && <Button className="mt-4" size="sm" onClick={onRetry}><RotateCw aria-hidden />Try again</Button>}
    </div>
  );
}

export const Callout = ({ tone = 'info', children, className }: { tone?: 'info' | 'success' | 'warning' | 'danger'; children: ReactNode; className?: string }) => (
  <div role={tone === 'danger' ? 'alert' : 'note'} className={cn('rounded-lg border px-4 py-3 text-sm', {
    info: 'border-primary/20 bg-primary-soft text-primary-ink', success: 'border-success/25 bg-success-soft text-success-ink',
    warning: 'border-warning/30 bg-warning-soft text-warning-ink', danger: 'border-danger/25 bg-danger-soft text-danger-ink',
  }[tone], className)}>{children}</div>
);
