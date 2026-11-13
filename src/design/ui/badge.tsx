import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const badge = cva('inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'bg-muted text-muted-foreground',
      primary: 'bg-primary-soft text-primary-ink',
      success: 'bg-success-soft text-success-ink',
      warning: 'bg-warning-soft text-warning-ink',
      danger: 'bg-danger-soft text-danger-ink',
    },
  },
  defaultVariants: { tone: 'neutral' },
});
const dotColour = { neutral: 'bg-subtle', primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' } as const;

export type BadgeTone = keyof typeof dotColour;
export function Badge({ tone = 'neutral', dot, className, children, ...p }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge> & { dot?: boolean }) {
  return <span className={cn(badge({ tone }), className)} {...p}>{dot && <span className={cn('size-1.5 rounded-full', dotColour[tone ?? 'neutral'])} aria-hidden />}{children}</span>;
}
