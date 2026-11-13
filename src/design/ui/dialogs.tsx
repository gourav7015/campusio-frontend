import { createContext, useCallback, useContext, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Textarea } from './form';

interface ConfirmOptions { title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
interface PromptOptions { title?: string; confirmLabel?: string; defaultValue?: string; required?: boolean; multiline?: boolean; placeholder?: string }
interface Api {
  /** Ask the person to confirm. Resolves true on Confirm, false on Cancel, Escape or clicking outside. */
  confirm: (message: ReactNode, options?: ConfirmOptions) => Promise<boolean>;
  /** Ask for a line of text. Resolves the text, or null on Cancel. */
  prompt: (message: ReactNode, options?: PromptOptions) => Promise<string | null>;
}
type Pending = { kind: 'confirm'; message: ReactNode; options: ConfirmOptions; resolve: (v: boolean) => void } | { kind: 'prompt'; message: ReactNode; options: PromptOptions; resolve: (v: string | null) => void };

const Ctx = createContext<Api>({ confirm: async (m) => window.confirm(String(m)), prompt: async (m, o) => window.prompt(String(m), o?.defaultValue) });
export const useDialogs = () => useContext(Ctx);

/** One accessible confirm/prompt dialog for the whole app, replacing the browser's window.confirm and window.prompt. */
export function DialogsProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const queue = useRef<Pending[]>([]);

  const show = useCallback((p: Pending) => { if (p.kind === 'prompt') { setText(p.options.defaultValue ?? ''); setTouched(false); } setPending(p); }, []);
  const next = useCallback(() => { const n = queue.current.shift(); if (n) show(n); else setPending(null); }, [show]);
  const enqueue = useCallback((p: Pending) => { setPending((cur) => { if (cur) { queue.current.push(p); return cur; } if (p.kind === 'prompt') { setText(p.options.defaultValue ?? ''); setTouched(false); } return p; }); }, []);

  const api = useMemo<Api>(() => ({
    confirm: (message, options = {}) => new Promise<boolean>((resolve) => enqueue({ kind: 'confirm', message, options, resolve })),
    prompt: (message, options = {}) => new Promise<string | null>((resolve) => enqueue({ kind: 'prompt', message, options, resolve })),
  }), [enqueue]);

  const finish = (value: boolean | string | null) => {
    if (!pending) return;
    if (pending.kind === 'confirm') pending.resolve(value === true); else pending.resolve(typeof value === 'string' ? value : null);
    next();
  };
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (pending?.kind !== 'prompt') return;
    if (pending.options.required && !text.trim()) { setTouched(true); return; }
    finish(text);
  };
  const danger = pending?.kind === 'confirm' && pending.options.danger;

  return (
    <Ctx.Provider value={api}>
      {children}
      <Dialog open={!!pending} onOpenChange={(open) => { if (!open) finish(pending?.kind === 'confirm' ? false : null); }}>
        {pending && (
          <DialogContent>
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{danger && <AlertTriangle className="size-4 text-danger-ink" aria-hidden />}{pending.options.title ?? (pending.kind === 'prompt' ? 'Add details' : 'Are you sure?')}</DialogTitle>
                <DialogDescription>{pending.message}</DialogDescription>
              </DialogHeader>
              {pending.kind === 'prompt' && (
                <DialogBody>
                  <Textarea autoFocus aria-label={typeof pending.message === 'string' ? pending.message : 'Details'} value={text} onChange={(e) => setText(e.target.value)} placeholder={pending.options.placeholder}
                    rows={pending.options.multiline === false ? 1 : 3} aria-invalid={touched && !text.trim() ? true : undefined} />
                  {touched && !text.trim() && <p role="alert" className="mt-1.5 text-xs text-danger-ink">This is required.</p>}
                </DialogBody>
              )}
              <DialogFooter>
                <Button type="button" onClick={() => finish(pending.kind === 'confirm' ? false : null)}>{pending.kind === 'confirm' ? pending.options.cancelLabel ?? 'Cancel' : 'Cancel'}</Button>
                <Button type="submit" variant={danger ? 'danger' : 'primary'} autoFocus={pending.kind === 'confirm'} onClick={pending.kind === 'confirm' ? (e) => { e.preventDefault(); finish(true); } : undefined}>{pending.options.confirmLabel ?? 'Confirm'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </Ctx.Provider>
  );
}
