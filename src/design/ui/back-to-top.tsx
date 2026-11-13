import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '../lib/cn';

/** Appears after the page has been scrolled a long way (long lists and reports) and returns to the top. */
export function BackToTop({ threshold = 700, className }: { threshold?: number; className?: string }) {
  const [show, setShow] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    const on = () => setShow(window.scrollY > threshold);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [threshold]);
  if (!show) return null;
  return (
    <button type="button" aria-label="Back to top" onClick={() => { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); document.getElementById('main-content')?.focus({ preventScroll: true }); }}
      className={cn('fixed bottom-20 right-4 z-40 grid size-10 place-items-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:bottom-6 lg:right-6', className)}>
      <ArrowUp className="size-4" aria-hidden />
    </button>
  );
}
