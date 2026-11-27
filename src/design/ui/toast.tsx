import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import * as m from 'framer-motion/m';
import { AlertCircle, CheckCircle2, WifiOff, X } from 'lucide-react';
import { cn } from '../lib/cn';

type Kind = 'ok' | 'error' | 'offline' | 'busy';
type Item = { id: number; message: string; kind: Kind };
const Ctx = createContext<(message: string, kind?: Kind) => unknown>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((s) => s.filter((x) => x.id !== id)), []);
  const push = useCallback((message: string, kind: Kind = 'ok') => {
    const id = ++seq.current;
    setItems((s) => [...s.slice(-3), { id, message, kind }]);
    if (kind !== 'busy') setTimeout(() => dismiss(id), kind === 'ok' ? 3500 : 6000);
    return id;
  }, [dismiss]);
  // a file being fetched (api/client.js `download`) is acknowledged at once, then replaced by "downloaded"; a failure is reported by the caller
  const pending = useRef(new Map<string, number>());
  useEffect(() => {
    const on = (e: Event) => {
      const { phase, filename } = (e as CustomEvent).detail || {};
      const old = pending.current.get(filename);
      if (old) { dismiss(old); pending.current.delete(filename); }
      if (phase === 'start') pending.current.set(filename, push(`Preparing ${filename}… it will download in a moment.`, 'busy'));
      else if (phase === 'done') push(`${filename} downloaded.`, 'ok');
    };
    window.addEventListener('app:download', on);
    return () => window.removeEventListener('app:download', on);
  }, [push, dismiss]);
  const value = useMemo(() => push, [push]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 pb-[calc(env(safe-area-inset-bottom)+72px)] sm:items-end sm:pb-4" aria-live="polite">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <m.div key={t.id} layout initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }} transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              className={cn('pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-card p-3 pr-2 shadow-md', t.kind === 'error' ? 'border-danger/30' : t.kind === 'offline' ? 'border-warning/40' : 'border-border')} role={t.kind === 'error' ? 'alert' : 'status'}>
              {t.kind === 'busy' ? <span className="sk-dots mt-2 shrink-0 text-muted-foreground" aria-hidden><i /><i /><i /></span> : t.kind === 'error' ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden /> : t.kind === 'offline' ? <WifiOff className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />}
              <p className="min-w-0 flex-1 text-sm">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted"><X className="size-3.5" aria-hidden /></button>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
