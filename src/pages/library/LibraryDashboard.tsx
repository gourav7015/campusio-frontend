import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeftRight, Clock, Download } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useGet } from '../../api/query';
import { download } from '../../api/client.js';
import { axisProps, ChartCard, ChartTooltip, chartColor, gridProps, useChartMotion } from '../../design/charts';
import { AttentionList, Facts, LinkCard, ShareList } from '../../design/patterns';
import { Badge, Button, DataTable, EmptyState, ErrorState, PageHeader, PageSkeleton, StatCard, useToast, type BadgeTone } from '../../design/ui';
import { fmtDate, fmtMoney, label } from '../../components/ui.jsx';
import { ScanBox } from './ScanBox';

interface Row { book: string; borrower: string; status: string; dueDate?: string }
interface Dash { today: string; titles: number; copies: number; available: number; onLoan: number; issuedToday: number; returnedToday: number; overdue: number; finesThisMonth: number; trend: { date: string; issued: number; returned: number }[]; topBooks: { title: string; issues: number }[]; categories: { category: string; titles: number }[]; recent: Row[] }
const day = (v: string) => { const [, m, d] = v.split('-'); return `${Number(d)}/${Number(m)}`; };
const tone = (s: string): BadgeTone => (s === 'returned' ? 'success' : s === 'lost' ? 'danger' : 'primary');

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'book', header: 'Book', cell: (c) => <span className="font-medium">{c.row.original.book}</span> },
  { accessorKey: 'borrower', header: 'Borrower' },
  { id: 'status', header: 'Status', accessorFn: (r) => r.status, cell: (c) => <Badge tone={tone(c.row.original.status)} dot>{label(c.row.original.status)}</Badge> },
  { id: 'due', header: 'Due', accessorFn: (r) => r.dueDate ?? '', cell: (c) => fmtDate(c.row.original.dueDate), meta: { hideBelow: 'sm' } },
];

export default function LibraryDashboard({ readOnly }: { readOnly?: boolean }) {
  const base = readOnly ? '/api/school/library' : '/api/library';
  const path = readOnly ? '/admin/library' : '/library';
  const { data: x, error, refetch } = useGet<Dash>(`${base}/dashboard`);
  const motion = useChartMotion();
  const toast = useToast();
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!x) return <PageSkeleton />;
  const exportFile = (file: string, name: string, q?: Record<string, string>) => (download as (u: string, n: string, q?: Record<string, string>) => Promise<void>)(`${base}/export/${file}`, name, q).catch((e: Error) => toast(e.message, 'error'));

  return (
    <div className="space-y-6">
      <PageHeader title="Library overview" description={readOnly ? 'View-only for the School Admin. Circulation is handled at the library desk.' : `Circulation today · ${fmtDate(x.today, true)}`}
        actions={!readOnly && <Button variant="primary" asChild><Link to="/library/desk"><ArrowLeftRight />Issue or return</Link></Button>} />

      {!readOnly && <ScanBox />}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><AttentionList items={[{ label: 'Overdue books to collect', count: x.overdue, to: `${path}${readOnly ? '?tab=loans' : '/loans'}`, icon: Clock, tone: 'danger' }]} /></div>
        <LinkCard title="Today" to={`${path}${readOnly ? '?tab=loans' : '/loans'}`} linkLabel="Loans"><Facts rows={[{ label: 'Issued', value: x.issuedToday }, { label: 'Returned', value: x.returnedToday }, { label: 'Fines this month', value: fmtMoney(x.finesThisMonth) }]} /></LinkCard>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Titles" value={x.titles.toLocaleString('en-IN')} hint={`${x.copies.toLocaleString('en-IN')} copies`} to={`${path}${readOnly ? '?tab=books' : '/books'}`} />
        <StatCard label="Available now" value={x.available.toLocaleString('en-IN')} to={`${path}${readOnly ? '?tab=books' : '/books'}`} />
        <StatCard label="On loan" value={x.onLoan.toLocaleString('en-IN')} to={`${path}${readOnly ? '?tab=loans' : '/loans'}`} />
        <StatCard label="Overdue" value={x.overdue.toLocaleString('en-IN')} to={`${path}${readOnly ? '?tab=loans' : '/loans'}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Issues and returns, last 14 days" description="Books issued (accent) and returned" height={260}>
          {x.trend?.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={x.trend} margin={{ left: -12, right: 8, top: 4 }}>
            <CartesianGrid {...gridProps} /><XAxis dataKey="date" tickFormatter={day} {...axisProps} /><YAxis allowDecimals={false} {...axisProps} />
            <Tooltip content={<ChartTooltip />} labelFormatter={day} cursor={{ stroke: chartColor.neutral }} />
            <Area type="monotone" dataKey="returned" name="Returned" stroke={chartColor.neutral} strokeWidth={1.5} fill="none" {...motion} />
            <Area type="monotone" dataKey="issued" name="Issued" stroke={chartColor.primary} strokeWidth={2} fill={chartColor.primary} fillOpacity={0.08} {...motion} />
          </AreaChart></ResponsiveContainer> : <p className="grid h-full place-items-center text-sm text-muted-foreground">No circulation yet</p>}
        </ChartCard>
        <LinkCard title="Most borrowed">
          {x.topBooks.length ? <ShareList items={x.topBooks.map((b) => ({ label: b.title, value: b.issues, tone: 'primary' as const }))} total={x.topBooks[0].issues * x.topBooks.length} /> : <EmptyState title="No loans yet" className="py-6" />}
        </LinkCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <LinkCard title="Titles by category" className="lg:col-span-1">{x.categories.length ? <ShareList items={x.categories.slice(0, 8).map((c, i) => ({ label: c.category || 'Uncategorised', value: c.titles, tone: i === 0 ? 'primary' as const : 'neutral' as const }))} /> : <p className="text-sm text-muted-foreground">No titles yet.</p>}</LinkCard>
        <section className="space-y-3 lg:col-span-2" aria-labelledby="circ-h"><h2 id="circ-h" className="text-lg font-semibold tracking-tight">Recent circulation</h2>
          <DataTable columns={columns} data={x.recent} getRowId={(r, i) => `${r.book}-${i}`} pageSize={6} searchPlaceholder="Search circulation" emptyTitle="No activity yet" caption="Recent circulation" /></section>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => exportFile('inventory.csv', 'inventory.csv')}><Download />Export inventory</Button>
          <Button onClick={() => exportFile('loans.csv', 'loans.csv', { status: 'all' })}><Download />Export all loans</Button>
          <span className="flex-1" /><Link to="/library/loans" className="text-[13px] font-medium text-primary-ink hover:underline">Open loans</Link>
        </div>
      )}
    </div>
  );
}
