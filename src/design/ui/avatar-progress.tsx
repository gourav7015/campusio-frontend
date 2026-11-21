import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { animate } from 'framer-motion/dom';
import { cn } from '../lib/cn';

export function Avatar({ name, src, size = 32, className }: { name: string; src?: string; size?: number; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) };
  return src
    ? <img src={src} alt="" style={style} className={cn('shrink-0 rounded-full object-cover', className)} />
    : <span style={style} aria-hidden className={cn('grid shrink-0 place-items-center rounded-full bg-tone-soft font-semibold text-tone-ink', className)}>{initials}</span>;
}

export function Progress({ value, className, label }: { value: number; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${v}%` }} />
    </div>
  );
}

/** Circular progress. The number counts up and the arc draws once on mount (instant with reduced motion). */
export function ProgressRing({ value, size = 112, stroke = 10, label, caption, tone = 'primary' }: { value: number; size?: number; stroke?: number; label?: string; caption?: string; tone?: 'primary' | 'success' | 'warning' | 'danger' }) {
  const reduce = useReducedMotion();
  const target = Math.max(0, Math.min(100, value));
  const [tween, setTween] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const c = animate(0, target, { duration: 0.9, ease: [0.2, 0.8, 0.2, 1], onUpdate: (v) => setTween(v) });
    return () => c.stop();
  }, [target, reduce]);
  const shown = reduce ? target : tween;
  const r = (size - stroke) / 2; const circ = 2 * Math.PI * r;
  const colour = { primary: 'stroke-primary', success: 'stroke-success', warning: 'stroke-warning', danger: 'stroke-danger' }[tone];
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(target)} percent`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round" className={cn('fill-none', colour)} strokeDasharray={circ} strokeDashoffset={circ * (1 - shown / 100)} />
      </svg>
      <div className="absolute text-center leading-tight"><div className="font-semibold tabular-nums" style={{ fontSize: Math.max(12, Math.round(size * 0.22)) }}>{Math.round(shown)}%</div>{caption && <div className="text-xs text-muted-foreground">{caption}</div>}</div>
    </div>
  );
}

export const Kbd = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-sans text-[11px] font-medium text-muted-foreground', className)}>{children}</kbd>
);
