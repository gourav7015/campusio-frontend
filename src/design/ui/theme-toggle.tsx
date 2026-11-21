import { AnimatePresence } from 'framer-motion';
import * as m from 'framer-motion/m';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { cn } from '../lib/cn';
import { Tooltip } from './menu';

/** Sun while the light theme is showing, moon while the dark theme is showing. One press switches. */
export function ThemeToggle({ className, tooltip = true }: { className?: string; tooltip?: boolean }) {
  const { resolved, toggle } = useTheme();
  const dark = resolved === 'dark';
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  const button = (
    <button type="button" onClick={toggle} aria-label={label} aria-pressed={dark} data-testid="theme-toggle"
      className={cn('relative grid size-9 place-items-center rounded-md text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <m.span key={dark ? 'moon' : 'sun'} initial={{ opacity: 0, rotate: -40, scale: 0.8 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 40, scale: 0.8 }} transition={{ duration: 0.16 }} className="grid place-items-center">
          {dark ? <Moon className="size-[18px]" strokeWidth={1.75} aria-hidden /> : <Sun className="size-[18px]" strokeWidth={1.75} aria-hidden />}
        </m.span>
      </AnimatePresence>
    </button>
  );
  return tooltip ? <Tooltip label={label} side="bottom">{button}</Tooltip> : button;
}
