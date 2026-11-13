import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes, type ReactNode } from 'react';
import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

const Overlay = forwardRef<ElementRef<typeof D.Overlay>, ComponentPropsWithoutRef<typeof D.Overlay>>(({ className, ...p }, ref) => (
  <D.Overlay ref={ref} className={cn('fixed inset-0 z-50 bg-navy/40 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0', className)} {...p} />
));
Overlay.displayName = 'Overlay';

const Close = () => (
  <D.Close className="absolute right-3 top-3 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close">
    <X className="size-4" aria-hidden />
  </D.Close>
);

/** Centered dialog; on phones it becomes a bottom sheet. */
export const DialogContent = forwardRef<ElementRef<typeof D.Content>, ComponentPropsWithoutRef<typeof D.Content> & { wide?: boolean }>(({ className, children, wide, ...p }, ref) => (
  <D.Portal>
    <Overlay />
    <D.Content ref={ref} className={cn(
      'fixed z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden border border-border bg-card shadow-lg focus-visible:outline-none',
      'inset-x-0 bottom-0 rounded-t-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
      'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:fade-out-0',
      wide ? 'sm:max-w-3xl' : 'sm:max-w-lg', className)} {...p}>
      {children}<Close />
    </D.Content>
  </D.Portal>
));
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('flex flex-col gap-1 border-b border-border px-5 py-4 pr-12', className)} {...p} />;
export const DialogBody = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', className)} {...p} />;
export const DialogFooter = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('flex flex-col-reverse gap-2 border-t border-border px-5 py-3 sm:flex-row sm:justify-end', className)} {...p} />;
export const DialogTitle = forwardRef<ElementRef<typeof D.Title>, ComponentPropsWithoutRef<typeof D.Title>>(({ className, ...p }, ref) => <D.Title ref={ref} className={cn('text-base font-semibold leading-6 tracking-tight', className)} {...p} />);
DialogTitle.displayName = 'DialogTitle';
export const DialogDescription = forwardRef<ElementRef<typeof D.Description>, ComponentPropsWithoutRef<typeof D.Description>>(({ className, ...p }, ref) => <D.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...p} />);
DialogDescription.displayName = 'DialogDescription';

/** Side drawer for forms and detail panels (right on desktop, full-width sheet on phones). */
export function Drawer({ open, onOpenChange, title, description, children, footer, width = 'sm:max-w-md' }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; width?: string }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <Overlay />
        <D.Content className={cn('fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-card shadow-lg focus-visible:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right', width)}>
          <DialogHeader><DialogTitle>{title}</DialogTitle>{description ? <DialogDescription>{description}</DialogDescription> : <D.Description className="sr-only">{title}</D.Description>}</DialogHeader>
          <DialogBody>{children}</DialogBody>
          {footer && <DialogFooter>{footer}</DialogFooter>}
          <Close />
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
