import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { HandCoins, UserX } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useGet } from '../../api/query';
import { axisProps, ChartCard, ChartTooltip, chartColor, gridProps, useChartMotion } from '../../design/charts';
import { AttentionList, LinkCard, Money, ShareList } from '../../design/patterns';
import { Badge, Button, DataTable, ErrorState, PageHeader, PageSkeleton, StatCard } from '../../design/ui';
import { fmtDate, fmtMoney, label } from '../../components/ui.jsx';

interface Payment { receiptNo: string; paidOn: string; student: string; amount: number; kind?: string; mode: string; status?: string }
interface Dash { today: string; collectedToday: number; receiptsToday: number; collectedMonth: number; pending: number; overdue: number; defaulters: number; studentsUnbilled: number; trend: { date: string; amount: number }[]; modes: { mode: string; amount: number }[]; recent: Payment[] }

const day = (v: string) => { const [, m, d] = v.split('-'); return `${Number(d)}/${Number(m)}`; };
const inr = (v: number | string) => fmtMoney(Number(v));

export default function FinanceDashboard({ readOnly }: { readOnly?: boolean }) {
  const base = readOnly ? '/api/school/finance' : '/api/finance';
  const path = readOnly ? '/admin/fees' : '/finance';
  const { data: x, error, refetch } = useGet<Dash>(`${base}/dashboard`);
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
