import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useGet } from '../../api/query';
import { Button, Input } from '../../design/ui';
import { fmtMoney, useDebounced } from '../../components/ui.jsx';
import { PayModal } from './Finance.jsx';

interface Row { studentId: string; name?: string; admissionNo?: string; guardian?: string; pending: number; overdue: number }

/** The fee counter: type a name or admission number, pick the student, and land on their account with the instalments, ready to collect. */
interface Charge { _id: string; label: string; outstanding: number; status: string; dueDate?: string }
interface Account { student: { id: string; name: string }; charges: Charge[]; totals: { pending: number; overdue?: number } }

/** The chosen student's open dues, with the collect-payment form and the receipt one click away. */
function Picked({ id, base, onClear }: { id: string; base: string; onClear: () => void }) {
  const { data: x, refetch } = useGet<Account>(`/api/finance/students/${id}/account`);
  const [pay, setPay] = useState(false);
  if (!x) return <p className="mt-3 text-sm text-muted-foreground">Loading the account…</p>;
  const open = x.charges.filter((c) => c.status === 'open');
  return (
    <div className="mt-3 rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-3"><div><b className="text-base font-semibold">{x.student.name}</b><p className="text-[13px] text-muted-foreground">{open.length ? `${open.length} open charge${open.length === 1 ? '' : 's'}` : 'Nothing is due'}</p></div><button type="button" onClick={onClear} className="text-[13px] font-medium text-primary-ink hover:underline">Choose another</button></div>
      {open.length > 0 && <ul className="mt-2 divide-y divide-border text-sm">{open.map((c) => <li key={c._id} className="flex justify-between gap-3 py-2"><span>{c.label}</span><b className="tabular-nums">{fmtMoney(c.outstanding)}</b></li>)}</ul>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><span className="text-[13px] text-muted-foreground">To collect now</span><b className="text-2xl font-semibold tracking-tight tabular-nums">{fmtMoney(x.totals.pending)}</b></div>
      <div className="mt-3 flex flex-wrap gap-2"><Button variant="primary" disabled={!open.length} onClick={() => setPay(true)}>Collect payment and print receipt</Button><Button asChild variant="secondary"><Link to={`${base}/students/${id}`}>Open the account</Link></Button></div>
      {pay && <PayModal x={x} base="/api/finance" onClose={() => setPay(false)} onDone={() => { setPay(false); refetch(); }} />}
    </div>
  );
}

export function CounterSearch({ base = '/finance' }: { base?: string }) {
  const [q, setQ] = useState('');
  const [pick, setPick] = useState<string | null>(null);
  const term = useDebounced((q as string).trim()) as string;
  const { data } = useGet<{ items: Row[]; total: number }>(term.length >= 2 ? '/api/finance/students' : null, { q: term, limit: 6 });
  return (
    <section aria-labelledby="counter-h" className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
      <h2 id="counter-h" className="text-[15px] font-semibold tracking-tight">Collect fees</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">Find a student by name or admission number.</p>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3.5 top-3 size-4 text-subtle" aria-hidden />
        <Input aria-label="Find a student to collect fees" placeholder="Name or admission number" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-xl pl-10" />
      </div>
      {pick && <Picked id={pick} base={base} onClear={() => setPick(null)} />}
      {!pick && term.length >= 2 && data && (
        data.items.length ? (
          <ul className="mt-2.5 overflow-hidden rounded-2xl border border-border">
            {data.items.map((s) => (
              <li key={s.studentId} className="border-t border-border first:border-t-0">
                <button type="button" onClick={() => setPick(s.studentId)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-tone-soft focus-visible:bg-tone-soft focus-visible:outline-none">
                  <span aria-hidden className="grid size-8 flex-none place-items-center rounded-full bg-tone-soft text-xs font-semibold text-tone-ink">{(s.name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><b className="block truncate font-medium">{s.name}</b><span className="block truncate text-[13px] text-muted-foreground">{s.admissionNo}{s.guardian ? ` · ${s.guardian}` : ''}</span></span>
                  <span className="text-right text-[13px]"><b className="block font-semibold tabular-nums">{s.pending ? fmtMoney(s.pending) : 'Paid'}</b><span className={s.overdue ? 'text-danger-ink' : 'text-muted-foreground'}>{s.overdue ? `${fmtMoney(s.overdue)} overdue` : s.pending ? 'pending' : 'nothing due'}</span></span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-muted-foreground">No student matches “{term}”.</p>
      )}
    </section>
  );
}
