import { cloneElement, forwardRef, isValidElement, useId, useState, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/cn';

const control = 'w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-subtle hover:border-subtle focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, type = 'text', ...p }, ref) => (
  <input ref={ref} type={type} className={cn(control, 'h-9', className)} {...p} />
));
Input.displayName = 'Input';

/** Password field with a show/hide button. The button is a real, focusable control with its state announced. */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? 'text' : 'password'} className={cn('pr-10', className)} {...p} />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
        className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(control, 'min-h-[88px] py-2', className)} {...p} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...p }, ref) => (
  <div className="relative">
    <select ref={ref} className={cn(control, 'h-9 appearance-none pr-9', className)} {...p}>{children}</select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
  </div>
));
Select.displayName = 'Select';

export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label className={cn('text-[13px] font-medium leading-5 text-foreground', className)} {...p} />;

/** Label + control + hint/error. Works with react-hook-form: pass the field error message as `error`. */
export function FormField({ label, hint, error, required, children, className }: { label: string; hint?: ReactNode; error?: string; required?: boolean; children: ReactElement; className?: string }) {
  const auto = useId();
  const id = (children.props as { id?: string }).id ?? auto;
  const described = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}{required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}</Label>
      {isValidElement(children) ? cloneElement(children as ReactElement<Record<string, unknown>>, { id, 'aria-describedby': described, 'aria-invalid': error ? true : undefined, required }) : children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger-ink">{error}</p>}
    </div>
  );
}
