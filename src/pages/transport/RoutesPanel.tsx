import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import * as m from 'framer-motion/m';
import { useGet } from '../../api/query';
import { Badge, Button, Input } from '../../design/ui';
import { cn } from '../../design/lib/cn';

interface Stop { name: string; pickupTime?: string; dropTime?: string }
interface BusRow { _id: string; busNo: string; routeName?: string; status: string; capacity: number; students: number; startTime?: string; stops: Stop[]; driver?: { name: string } | null; conductor?: { name: string } | null }

const title = (b: BusRow) => b.routeName || `Bus ${b.busNo}`;
const stopsText = (b: BusRow) => `${b.stops.length} stop${b.stops.length === 1 ? '' : 's'}${b.startTime ? ` · starts ${b.startTime}` : ''}`;

/** The stops of one route, in order, in a side panel so the table stays in view. */
function RouteDetail({ b, buses, onClose }: { b: BusRow; buses?: string; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return createPortal(
    <>
      <button type="button" aria-label="Close route details" onClick={onClose} className="fixed inset-0 z-[55] bg-navy/30 lg:hidden" />
      <m.aside initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }} role="dialog" aria-label={`${title(b)} details`}
        className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[420px] flex-col border-l border-border bg-card shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0"><h2 className="text-lg font-semibold tracking-tight">{title(b)}</h2><p className="text-[13px] text-muted-foreground">{stopsText(b)}</p></div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}><X /></Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap gap-2"><Badge>Bus {b.busNo}</Badge><Badge>{b.driver?.name ? `Driver ${b.driver.name}` : 'No driver yet'}</Badge>{b.conductor?.name && <Badge>Conductor {b.conductor.name}</Badge>}<Badge tone={b.status === 'active' ? 'success' : 'warning'}>{b.status === 'active' ? 'Active' : b.status}</Badge></div>
          <p className="mt-4 text-sm"><b className="font-semibold tabular-nums">{b.students}</b> of {b.capacity} seats taken</p>
          {b.stops.length ? (
            <ol className="relative mt-4 pl-7 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-0.5 before:bg-border">
              {b.stops.map((s, i) => (
                <li key={`${s.name}-${i}`} className="relative flex justify-between gap-3 py-2 before:absolute before:-left-[26px] before:top-3.5 before:size-3 before:rounded-full before:border-2 before:border-border-strong before:bg-card">
                  <b className="font-medium">{s.name}</b><span className="text-[13px] tabular-nums text-muted-foreground">{s.pickupTime || ''}</span>
                </li>
              ))}
            </ol>
          ) : <p className="mt-4 text-sm text-muted-foreground">No stops have been added to this route yet.</p>}
        </div>
        {buses && <div className="border-t border-border px-5 py-4"><Button asChild><Link to={buses}>Manage buses and riders</Link></Button></div>}
      </m.aside>
    </>,
    document.body,
  );
}

/** Every route in one compact table: its bus, crew and riders. Pick a route to read its stops in a side panel. Only what the school has entered: there is no live tracking, so no "delayed" or "on route". */
export function RoutesPanel({ base, buses }: { base: string; buses?: string }) {
  const { data } = useGet<BusRow[]>(`${base}/buses`);
  const [pick, setPick] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const list = (data ?? []).filter((b) => b.routeName || b.stops.length);
  if (!list.length) return null;
  const needle = q.trim().toLowerCase();
  const rows = list.filter((b) => !needle || `${b.routeName || ''} ${b.busNo} ${b.driver?.name || ''}`.toLowerCase().includes(needle));
  const cur = list.find((b) => b._id === pick) ?? null;
  return (
    <section aria-labelledby="routes-h" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="routes-h" className="text-lg font-semibold tracking-tight">Routes</h2>
        <div className="flex items-center gap-4">
          {list.length > 6 && <div className="relative w-56"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden /><Input aria-label="Find a route, bus or driver" placeholder="Find a route or driver" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>}
          {buses && <Link to={buses} className="text-[13.5px] font-medium text-primary-ink hover:underline">Manage buses and riders</Link>}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table aria-label="Routes" className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs font-medium text-muted-foreground"><th scope="col" className="px-4 py-3">Route</th><th scope="col" className="px-4 py-3">Bus and driver</th><th scope="col" className="w-[240px] px-4 py-3">Riders</th><th scope="col" className="px-4 py-3">Status</th></tr></thead>
            <tbody>
              {rows.map((b) => {
                const pc = b.capacity ? Math.min(100, (b.students / b.capacity) * 100) : 0;
                return (
                  <tr key={b._id} onClick={() => setPick(b._id)} className={cn('cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/60', b._id === pick && 'bg-tone-soft')}>
                    <td className="px-4 py-3">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPick(b._id); }} aria-haspopup="dialog" className="rounded-md text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{title(b)}</button>
                      <div className="text-[13px] text-muted-foreground">{stopsText(b)}</div>
                    </td>
                    <td className="px-4 py-3">Bus {b.busNo}<div className="text-[13px] text-muted-foreground">{b.driver?.name || 'No driver yet'}</div></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden><div className={cn('h-full rounded-full', pc >= 100 ? 'bg-warning' : 'bg-primary')} style={{ width: `${pc}%` }} /></div><span className="text-[13px] tabular-nums">{b.students}/{b.capacity}</span></div></td>
                    <td className="px-4 py-3"><Badge tone={b.status === 'active' ? 'success' : 'warning'}>{b.status === 'active' ? 'Active' : b.status}</Badge></td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No route matches.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {cur && <RouteDetail key={cur._id} b={cur} buses={buses} onClose={() => setPick(null)} />}
    </section>
  );
}
