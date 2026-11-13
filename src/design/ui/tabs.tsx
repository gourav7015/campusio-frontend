import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as T from '@radix-ui/react-tabs';
import { cn } from '../lib/cn';

export const Tabs = T.Root;
export const TabsList = forwardRef<ElementRef<typeof T.List>, ComponentPropsWithoutRef<typeof T.List>>(({ className, ...p }, ref) => (
  <T.List ref={ref} className={cn('flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]', className)} {...p} />
));
TabsList.displayName = 'TabsList';
export const TabsTrigger = forwardRef<ElementRef<typeof T.Trigger>, ComponentPropsWithoutRef<typeof T.Trigger>>(({ className, ...p }, ref) => (
  <T.Trigger ref={ref} className={cn('-mb-px whitespace-nowrap border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:border-primary data-[state=active]:text-foreground', className)} {...p} />
));
TabsTrigger.displayName = 'TabsTrigger';
export const TabsContent = forwardRef<ElementRef<typeof T.Content>, ComponentPropsWithoutRef<typeof T.Content>>(({ className, ...p }, ref) => (
  <T.Content ref={ref} className={cn('pt-5 focus-visible:outline-none data-[state=active]:animate-rise', className)} {...p} />
));
TabsContent.displayName = 'TabsContent';

/** Small pill switcher for views (grid / table, week / day). */
export function Segmented<V extends string>({ value, onChange, options, label }: { value: V; onChange: (v: V) => void; options: { value: V; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-input bg-muted p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn('h-7 rounded-[6px] px-3 text-[13px] font-medium transition-[background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', value === o.value ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}>{o.label}</button>
      ))}
    </div>
  );
}
