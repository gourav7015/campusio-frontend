import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as M from '@radix-ui/react-dropdown-menu';
import * as P from '@radix-ui/react-popover';
import * as TT from '@radix-ui/react-tooltip';
import { cn } from '../lib/cn';

const panel = 'z-50 overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1';

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuContent = forwardRef<ElementRef<typeof M.Content>, ComponentPropsWithoutRef<typeof M.Content>>(({ className, sideOffset = 6, ...p }, ref) => (
  <M.Portal><M.Content ref={ref} sideOffset={sideOffset} className={cn(panel, 'min-w-[200px] p-1', className)} {...p} /></M.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';
export const DropdownMenuItem = forwardRef<ElementRef<typeof M.Item>, ComponentPropsWithoutRef<typeof M.Item> & { danger?: boolean }>(({ className, danger, ...p }, ref) => (
  <M.Item ref={ref} className={cn('flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground', danger && 'text-danger-ink [&_svg]:text-danger-ink', className)} {...p} />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';
export const DropdownMenuLabel = ({ className, ...p }: ComponentPropsWithoutRef<typeof M.Label>) => <M.Label className={cn('px-2.5 py-1.5 text-xs font-medium text-muted-foreground', className)} {...p} />;
export const DropdownMenuSeparator = ({ className, ...p }: ComponentPropsWithoutRef<typeof M.Separator>) => <M.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...p} />;

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverContent = forwardRef<ElementRef<typeof P.Content>, ComponentPropsWithoutRef<typeof P.Content>>(({ className, sideOffset = 8, align = 'end', ...p }, ref) => (
  <P.Portal><P.Content ref={ref} sideOffset={sideOffset} align={align} className={cn(panel, 'w-80 max-w-[92vw]', className)} {...p} /></P.Portal>
));
PopoverContent.displayName = 'PopoverContent';

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <TT.Provider delayDuration={250} skipDelayDuration={100}>{children}</TT.Provider>;
export function Tooltip({ label, children, side = 'right' }: { label: string; children: React.ReactNode; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <TT.Provider delayDuration={250} skipDelayDuration={100}><TT.Root>
      <TT.Trigger asChild>{children}</TT.Trigger>
      <TT.Portal><TT.Content side={side} sideOffset={8} className="z-50 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0">{label}</TT.Content></TT.Portal>
    </TT.Root></TT.Provider>
  );
}
