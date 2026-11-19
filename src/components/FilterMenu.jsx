import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../design/ui';

/**
 * Filters stay out of the way: one small icon, with a count of what is switched on. Click it to open a wide panel with the choices laid out
 * side by side; "Clear all" puts everything back and "Done" closes it. `count` is how many filters are active; `onClear` resets them.
 * Put the filter fields (Field + Select) inside; they flow into columns to fit the width.
 */
export default function FilterMenu({ count = 0, onClear, children, title = 'Filters' }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="btn" aria-label={count ? `${title}, ${count} on` : title} title={title} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', minWidth: 40, ...(count ? { borderColor: 'rgb(var(--c-primary))' } : {}) }}>
          <SlidersHorizontal size={16} aria-hidden />
          {count > 0 && <span aria-hidden style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: 'rgb(var(--c-primary))', color: 'rgb(var(--c-on-accent))', fontSize: 11, fontWeight: 600, display: 'grid', placeItems: 'center', padding: '0 4px' }}>{count}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={16} className="w-[min(760px,92vw)] max-w-none p-0" aria-label={title}>
        <div className="row between" style={{ alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="row" style={{ alignItems: 'center', gap: 8 }}><SlidersHorizontal size={16} aria-hidden /><b>{title}</b>{count > 0 && <span className="small muted">{count} on</span>}</div>
          <button type="button" className="btn sm" onClick={() => setOpen(false)} aria-label="Close filters" style={{ padding: '4px 6px' }}><X size={16} aria-hidden /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px 16px', padding: 16, alignItems: 'end' }}>{children}</div>
        <div className="row between" style={{ alignItems: 'center', padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--grey-50, rgba(127,127,127,.06))', borderRadius: '0 0 12px 12px' }}>
          <button type="button" className="btn sm" onClick={onClear} disabled={!count || !onClear}>Clear filters</button>
          <button type="button" className="btn primary sm" onClick={() => setOpen(false)}>Done</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
