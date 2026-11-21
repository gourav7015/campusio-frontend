import { useGet } from '../../api/query';
import { Badge, Progress } from '../../design/ui';
import { Money } from '../../design/patterns';
import { fmtDate } from '../../components/ui.jsx';

interface Row { dueDate: string | null; label: string; students: number; cleared: number; pendingStudents: number; net: number; collected: number; outstanding: number; percent: number; state: 'complete' | 'overdue' | 'due' | 'upcoming' | 'open' }
interface Report { items: Row[]; totals: { net: number; collected: number; outstanding: number; overdue: number; instalments: number; complete: number } }
const STATE: Record<Row['state'], { tone: 'success' | 'danger' | 'warning' | 'neutral'; text: string }> = {
  complete: { tone: 'success', text: 'Fully collected' }, overdue: { tone: 'danger', text: 'Overdue' }, due: { tone: 'warning', text: 'Due this month' }, upcoming: { tone: 'neutral', text: 'Upcoming' }, open: { tone: 'warning', text: 'Open' },
};

/** Every instalment (due date) of this year's fees: what was billed, what has come in, what is left, and how many students have cleared it. */
export default function InstalmentReport({ base }: { base: string }) {
  const { data, error } = useGet<Report>(`${base}/installments`);
  if (error) return <section aria-labelledby="inst-h" className="min-w-0 max-w-full space-y-3"><h2 id="inst-h" className="text-lg font-semibold tracking-tight">Instalment-wise collection</h2><p className="text-sm text-muted-foreground">This could not be loaded. Refresh the page to try again.</p></section>;
  if (!data) return null;
  const { items, totals } = data;
  return (
    <section aria-labelledby="inst-h" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h2 id="inst-h" className="text-lg font-semibold tracking-tight">Instalment-wise collection</h2>
          <p className="text-sm text-muted-foreground">{totals.instalments ? `${totals.complete} of ${totals.instalments} instalments fully collected · ${' '}` : ''}Each row is one due date of this year's fees.</p></div>
        {totals.overdue > 0 && <p className="text-sm">Overdue instalments: <b className="text-danger-ink"><Money amount={totals.overdue} /></b></p>}
      </div>
      {!items.length ? <p className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">No fees have been billed this year yet.</p> : (
        <div className="relative max-w-full overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Instalments table, scrolls sideways on small screens">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Fee instalments, with billed, collected and outstanding amounts</caption>
            <thead className="bg-muted/50 text-left text-[13px] text-muted-foreground"><tr>
              <th scope="col" className="px-3 py-2 font-medium">Instalment</th><th scope="col" className="px-3 py-2 font-medium">Due</th><th scope="col" className="px-3 py-2 font-medium">Students cleared</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Billed</th><th scope="col" className="px-3 py-2 text-right font-medium">Collected</th><th scope="col" className="px-3 py-2 text-right font-medium">Outstanding</th>
              <th scope="col" className="px-3 py-2 font-medium">Collected %</th><th scope="col" className="px-3 py-2 font-medium">Status</th></tr></thead>
            <tbody>{items.map((r) => (
              <tr key={r.dueDate || 'none'} className="border-t border-border">
                <th scope="row" className="px-3 py-2 text-left font-medium">{r.label}</th>
                <td className="px-3 py-2">{r.dueDate ? fmtDate(r.dueDate, true) : '—'}</td>
                <td className="px-3 py-2">{r.cleared} / {r.students}</td>
                <td className="px-3 py-2 text-right"><Money amount={r.net} /></td><td className="px-3 py-2 text-right"><Money amount={r.collected} /></td>
                <td className="px-3 py-2 text-right font-medium"><Money amount={r.outstanding} /></td>
                <td className="px-3 py-2"><div className="flex min-w-[120px] items-center gap-2"><Progress value={r.percent} label={`${r.label} collected`} className="w-20" /><span className="text-xs text-muted-foreground">{r.percent}%</span></div></td>
                <td className="px-3 py-2"><Badge tone={STATE[r.state].tone}>{STATE[r.state].text}</Badge></td>
              </tr>))}</tbody>
          </table>
        </div>)}
    </section>
  );
}
