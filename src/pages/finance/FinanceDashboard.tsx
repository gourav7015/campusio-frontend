import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { HandCoins, UserX } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useGet } from '../../api/query';
import { axisProps, ChartCard, ChartTooltip, chartColor, gridProps, useChartMotion } from '../../design/charts';
import { AttentionList, LinkCard, Money, ShareList } from '../../design/patterns';
import { Badge, Button, DataTable, ErrorState, Input, PageHeader, PageSkeleton, Select, StatCard } from '../../design/ui';
import { fmtDate, fmtMoney, label } from '../../components/ui.jsx';
import InstalmentReport from './InstalmentReport';

interface Payment { receiptNo: string; paidOn: string; student: string; amount: number; kind?: string; mode: string; status?: string }
interface Period { from: string; to: string; days: number; collected: number; receipts: number; perMonth: boolean; byMode: { mode: string; amount: number }[]; series: { label: string; amount: number }[] }
interface Dash { period: Period | null; today: string; collectedToday: number; receiptsToday: number; collectedMonth: number; pending: number; overdue: number; defaulters: number; studentsUnbilled: number; trend: { date: string; amount: number }[]; modes: { mode: string; amount: number }[]; recent: Payment[] }

// Indian financial year: 1 April to 31 March. A date in January–March belongs to the year that began the April before.
const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const fyOf = (today: string) => { const [y, m] = today.split('-').map(Number); const start = m >= 4 ? y : y - 1; return { from: ymd(start, 4, 1), to: ymd(start + 1, 3, 31), name: `${start}–${String(start + 1).slice(2)}` }; };
const PRESETS = (today: string) => {
  const fy = fyOf(today); const [y] = fy.from.split('-').map(Number); const mo = today.slice(0, 7);
  return {
    fy: { label: `This financial year (${fy.name})`, from: fy.from, to: fy.to },
    last: { label: `Last financial year (${y - 1}–${String(y).slice(2)})`, from: ymd(y - 1, 4, 1), to: ymd(y, 3, 31) },
    month: { label: 'This month', from: `${mo}-01`, to: today },
  } as Record<string, { label: string; from: string; to: string }>;
};
const monthLabel = (v: string) => { const [y, m] = v.split('-'); return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1]} ${y.slice(2)}`; };
const day = (v: string) => { const [, m, d] = v.split('-'); return `${Number(d)}/${Number(m)}`; };
const inr = (v: number | string) => fmtMoney(Number(v));

export default function FinanceDashboard({ readOnly }: { readOnly?: boolean }) {
  const base = readOnly ? '/api/school/finance' : '/api/finance';
  const path = readOnly ? '/admin/fees' : '/finance';
  const today = new Date().toLocaleDateString('en-CA');
  const presets = PRESETS(today);
  const [range, setRange] = useState<{ preset: string; from: string; to: string }>({ preset: 'fy', from: presets.fy.from, to: presets.fy.to });
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(range.from) && /^\d{4}-\d{2}-\d{2}$/.test(range.to) && range.from <= range.to && range.from >= '2000-01-01';
  const { data: x, error, refetch } = useGet<Dash>(`${base}/dashboard`, valid ? { from: range.from, to: range.to } : undefined, { placeholderData: (prev) => prev });
  const motion = useChartMotion();
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!x) return <PageSkeleton />;

  const columns: ColumnDef<Payment>[] = [
    { accessorKey: 'receiptNo', header: 'Receipt', cell: (c) => <span className="font-medium">{c.row.original.receiptNo}</span> },
    { id: 'date', header: 'Date', accessorFn: (r) => r.paidOn, cell: (c) => fmtDate(c.row.original.paidOn), meta: { hideBelow: 'sm' } },
    { accessorKey: 'student', header: 'Student' },
    { id: 'amount', header: 'Amount', accessorFn: (r) => r.amount, meta: { align: 'right' }, cell: (c) => <span className={c.row.original.kind === 'reversal' ? 'text-danger-ink' : ''}>{c.row.original.kind === 'reversal' ? '−' : ''}{fmtMoney(c.row.original.amount)}</span> },
    { id: 'mode', header: 'Mode', accessorFn: (r) => r.mode, cell: (c) => label(c.row.original.mode), meta: { hideBelow: 'md' } },
    { id: 'status', header: '', enableSorting: false, accessorFn: (r) => r.status, cell: (c) => c.row.original.status === 'reversed' ? <Badge tone="danger">Reversed</Badge> : null },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Fees overview" description={readOnly ? 'View-only for the School Admin. Collections are handled by the Finance desk.' : `Collections and dues · ${fmtDate(x.today, true)}`}
        actions={!readOnly && <Button variant="primary" asChild><Link to="/finance/students"><HandCoins />Collect a payment</Link></Button>} />

      <section aria-labelledby="period-h" className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="mr-auto"><h2 id="period-h" className="text-base font-semibold tracking-tight">Money received in a period</h2><p className="text-[13px] text-muted-foreground">Pick a financial year or any two dates.</p></div>
          <label className="grid gap-1 text-[13px] font-medium">Period
            <Select value={range.preset} onChange={(e) => { const k = e.target.value; setRange(k === 'custom' ? { ...range, preset: 'custom' } : { preset: k, from: presets[k].from, to: presets[k].to }); }}>
              {Object.entries(presets).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}<option value="custom">Custom dates</option>
            </Select></label>
          <label className="grid gap-1 text-[13px] font-medium">From<Input type="date" aria-label="From" value={range.from} max={range.to || undefined} onChange={(e) => setRange({ ...range, preset: 'custom', from: e.target.value })} /></label>
          <label className="grid gap-1 text-[13px] font-medium">To<Input type="date" aria-label="To" value={range.to} min={range.from || undefined} onChange={(e) => setRange({ ...range, preset: 'custom', to: e.target.value })} /></label>
        </div>
        {!valid ? <p className="text-sm text-muted-foreground" role="status">Choose a "from" date that is not after the "to" date.</p> : x.period && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="grid grid-cols-2 gap-4 lg:col-span-1 lg:grid-cols-1">
              <StatCard label={`Collected, ${fmtDate(x.period.from, true)} – ${fmtDate(x.period.to, true)}`} value={<Money amount={x.period.collected} />} hint={`${x.period.receipts} ${x.period.receipts === 1 ? 'receipt' : 'receipts'}`} />
              {x.period.byMode.length > 0 && <div className="rounded-xl border border-border p-3"><div className="mb-2 text-[13px] font-medium text-muted-foreground">By mode</div><ShareList items={x.period.byMode.map((m, i) => ({ label: label(m.mode), value: Math.round(m.amount), tone: i === 0 ? 'primary' : 'neutral' }))} /></div>}
            </div>
            <div className="h-64 lg:col-span-2" role="img" aria-label={`Amount received ${x.period.perMonth ? 'each month' : 'each day'} in the selected dates`}>
              {x.period.series.some((t) => t.amount > 0) ? <ResponsiveContainer width="100%" height="100%"><BarChart data={x.period.series} margin={{ left: 4, right: 8, top: 4 }}>
                <CartesianGrid {...gridProps} /><XAxis dataKey="label" tickFormatter={x.period.perMonth ? monthLabel : day} {...axisProps} /><YAxis {...axisProps} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip content={<ChartTooltip format={inr} />} labelFormatter={x.period.perMonth ? monthLabel : day} cursor={{ fill: 'rgb(var(--c-muted))' }} />
                <Bar dataKey="amount" name="Collected" fill={chartColor.primary} radius={[6, 6, 0, 0]} maxBarSize={36} {...motion} />
              </BarChart></ResponsiveContainer> : <p className="grid h-full place-items-center text-sm text-muted-foreground">Nothing was collected in this period</p>}
            </div>
          </div>
        )}
      </section>

      <InstalmentReport base={base} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><AttentionList items={[
          { label: 'Students with overdue fees', count: x.defaulters, to: readOnly ? '/admin/fees?tab=students' : '/finance/reports', icon: UserX, tone: 'danger' },
          { label: 'Enrolled students with no fees assigned', count: x.studentsUnbilled, to: readOnly ? '/admin/fees?tab=structures' : '/finance/structures', icon: HandCoins },
        ]} /></div>
        <LinkCard title="Collected this month, by mode" to={readOnly ? undefined : '/finance/payments'} linkLabel="Payments">
          {x.modes.length ? <ShareList items={x.modes.map((m, i) => ({ label: label(m.mode), value: Math.round(m.amount), tone: i === 0 ? 'primary' : 'neutral' }))} /> : <p className="py-6 text-center text-sm text-muted-foreground">No collections this month.</p>}
        </LinkCard>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Collected today" value={<Money amount={x.collectedToday} />} hint={`${x.receiptsToday} ${x.receiptsToday === 1 ? 'receipt' : 'receipts'}`} to={readOnly ? undefined : '/finance/payments'} />
        <StatCard label="Collected this month" value={<Money amount={x.collectedMonth} />} to={readOnly ? undefined : '/finance/reports'} />
        <StatCard label="Total pending" value={<Money amount={x.pending} />} to={readOnly ? '/admin/fees?tab=students' : '/finance/students'} />
        <StatCard label="Overdue" value={<Money amount={x.overdue} />} hint={`${x.defaulters} ${x.defaulters === 1 ? 'student' : 'students'}`} to={readOnly ? '/admin/fees?tab=students' : '/finance/reports'} />
      </div>

      <ChartCard title="Collection, last 14 days" description="Amount received per day" to={readOnly ? undefined : '/finance/reports'} linkLabel="Reports" height={260}>
        {x.trend?.some((t) => t.amount > 0) ? <ResponsiveContainer width="100%" height="100%"><BarChart data={x.trend} margin={{ left: 4, right: 8, top: 4 }}>
          <CartesianGrid {...gridProps} /><XAxis dataKey="date" tickFormatter={day} {...axisProps} /><YAxis {...axisProps} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
          <Tooltip content={<ChartTooltip format={inr} />} labelFormatter={day} cursor={{ fill: 'rgb(var(--c-muted))' }} />
          <Bar dataKey="amount" name="Collected" fill={chartColor.primary} radius={[6, 6, 0, 0]} maxBarSize={36} {...motion} />
        </BarChart></ResponsiveContainer> : <p className="grid h-full place-items-center text-sm text-muted-foreground">No collections yet</p>}
      </ChartCard>

      <section className="space-y-3" aria-labelledby="pay-h">
        <div className="flex items-center justify-between"><h2 id="pay-h" className="text-lg font-semibold tracking-tight">Recent payments</h2>{!readOnly && <Link to={`${path}/payments`} className="text-[13px] font-medium text-primary-ink hover:underline">All payments</Link>}</div>
        <DataTable columns={columns} data={x.recent} getRowId={(r, i) => `${r.receiptNo}-${i}`} pageSize={8} searchPlaceholder="Search payments" emptyTitle="No payments yet" caption="Recent payments" />
      </section>
    </div>
  );
}
