import { useSyncExternalStore, type HTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, Inbox, Lock, RotateCw, WifiOff, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { ErrorScreen, isConnectionProblem } from '../ErrorScreen';
import { SkeletonScene } from './skeleton';

/** A plain loading shape for small pieces (a number, a menu row); whole screens use SkeletonScene. */
export const Skeleton = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('sk', className)} aria-hidden {...p} />;

/** Page-level loading screen for a home page (a heading, number cards, a chart and a list). */
export function PageSkeleton() {
  return <SkeletonScene kind="dashboard" />;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: { icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div data-empty className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-4 grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon className="size-5" aria-hidden /></div>
      <p className="text-[15px] font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  if (isConnectionProblem(error)) return <ErrorScreen inline error={error} onRetry={onRetry} />;
  if ((error as { status?: number } | null)?.status === 403) return <EmptyState className={className} icon={Lock} title="You do not have access to this" description={(error as Error).message || 'Ask your school admin if you need it.'} />;
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Something went wrong';
  const message = raw;
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

const onlineNow = () => (typeof navigator === 'undefined' ? true : navigator.onLine);
const watchOnline = (cb: () => void) => { window.addEventListener('online', cb); window.addEventListener('offline', cb); return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); }; };

/** A notice at the bottom while the device has no internet connection, so a failure to save or load is understood as the connection, not the app. It sits clear of the top menu, which must stay usable. */
export function OfflineBanner() {
  const online = useSyncExternalStore(watchOnline, onlineNow, () => true);
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-20 z-[80] mx-auto flex max-w-lg items-center justify-center gap-2 rounded-xl border border-warning/40 bg-warning-soft px-4 py-2.5 text-center text-sm font-medium text-warning-ink shadow-md lg:bottom-5">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      No internet connection. Changes cannot be saved until you are back online.
    </div>
  );
}
