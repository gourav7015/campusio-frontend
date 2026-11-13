import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { interactive?: boolean }>(({ className, interactive, ...p }, ref) => (
  <div ref={ref} className={cn('rounded-lg border border-border/70 bg-card text-foreground shadow-xs', interactive && 'transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-md', className)} {...p} />
));
Card.displayName = 'Card';
export const CardHeader = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('flex min-h-[56px] items-center justify-between gap-3 border-b border-border px-5 py-3', className)} {...p} />;
export const CardTitle = ({ className, ...p }: HTMLAttributes<HTMLHeadingElement>) => <h3 className={cn('text-[15px] font-semibold leading-6 tracking-tight', className)} {...p} />;
export const CardDescription = ({ className, ...p }: HTMLAttributes<HTMLParagraphElement>) => <p className={cn('text-sm text-muted-foreground', className)} {...p} />;
export const CardContent = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('p-5', className)} {...p} />;
export const CardFooter = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('flex items-center gap-2 border-t border-border px-5 py-3', className)} {...p} />;
