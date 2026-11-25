import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bus, FileWarning, UserX } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useGet } from '../../api/query';
import { axisProps, ChartCard, ChartTooltip, chartColor, gridProps, useChartMotion } from '../../design/charts';
import { AttentionList, LinkCard } from '../../design/patterns';
import { Badge, DataTable, ErrorState, PageHeader, PageSkeleton, Segmented, StatCard } from '../../design/ui';
import { fmtDate } from '../../components/ui.jsx';
import { RoutesPanel } from './RoutesPanel';

type CertState = 'valid' | 'expiring' | 'expired' | 'missing';
interface Cert { busId: string; bus: string; doc: string; label: string; date: string | null; daysLeft: number | null; state: CertState }
interface Dash {
  buses: { running: number; total: number; maintenance?: number }; riders: number; occupancy: number | null; seatsFree: number;
  staff: { total: number; byDesignation: { name: string; count: number }[] };
  needsCrew: { busNo: string; missing: string[] }[]; alerts: { bus: string; field: string; date: string; expired: boolean }[];
  certificates: Cert[];
  idleCrew: { name: string; staffId: string; designation: string }[]; fullBuses: { busNo: string; riders: number; capacity: number }[];
}

const stateBadge: Record<CertState, { tone: 'success' | 'warning' | 'danger' | 'neutral'; text: string }> = {
  valid: { tone: 'success', text: 'Valid' }, expiring: { tone: 'warning', text: 'Expiring soon' }, expired: { tone: 'danger', text: 'Expired' }, missing: { tone: 'neutral', text: 'Not on file' },
};
const certCols: ColumnDef<Cert>[] = [
  { accessorKey: 'bus', header: 'Bus', cell: (c) => <span className="font-medium">{c.row.original.bus}</span> },
  { accessorKey: 'label', header: 'Document' },
  { id: 'date', header: 'Valid until', accessorFn: (r) => r.date ?? '', cell: (c) => (c.row.original.date ? fmtDate(c.row.original.date, true) : '—') },
  { id: 'days', header: 'Days left', meta: { align: 'right', hideBelow: 'sm' }, accessorFn: (r) => r.daysLeft ?? 99999, cell: (c) => { const d = c.row.original.daysLeft; return d == null ? '—' : d < 0 ? `${-d} overdue` : d; } },
  { id: 'state', header: 'Status', accessorFn: (r) => stateBadge[r.state].text, cell: (c) => { const b = stateBadge[c.row.original.state]; return <Badge tone={b.tone} dot>{b.text}</Badge>; } },
];
const idleCols: ColumnDef<Dash['idleCrew'][number]>[] = [
  { accessorKey: 'name', header: 'Name', cell: (c) => <span className="font-medium">{c.row.original.name}</span> },
  { accessorKey: 'staffId', header: 'ID', meta: { hideBelow: 'sm' } },
  { accessorKey: 'designation', header: 'Role' },
];

/** Transport desk dashboard: fleet, crew, seats, and what needs attention. View-only for the School Admin. */
export default function TransportDashboard({ base, links = {} }: { base: string; links?: { buses?: string } }) {
  const { data: x, error, refetch } = useGet<Dash>(`${base}/dashboard`);
  const motion = useChartMotion();
  const [certView, setCertView] = useState<'all' | 'attention'>('all');
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!x) return <PageSkeleton />;
  const buses = links.buses;
  const withFilter = (kind: string) => (buses ? `${buses}${buses.includes('?') ? '&' : '?'}attention=${kind}` : '#'); // the Buses page opens narrowed to these

  return (
    <div className="space-y-6">
      <PageHeader title="Transport" description="Your fleet, crew and riders at a glance" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><AttentionList items={[
          { label: 'Running buses short of a driver or conductor', count: x.needsCrew.length, to: withFilter('crew'), icon: UserX, tone: 'danger' },
          { label: 'Certificates or licences expired or due within 30 days', count: x.alerts.length, to: withFilter('papers'), icon: FileWarning },
        ]} /></div>
        <LinkCard title="Buses short of crew" to={buses} linkLabel="Buses">
          {x.needsCrew.length ? <ul className="space-y-2.5 text-sm">{x.needsCrew.map((b) => <li key={b.busNo} className="flex items-center justify-between gap-3"><span className="font-medium">{b.busNo}</span><span className="flex gap-1.5">{b.missing.map((m) => <Badge key={m} tone="warning">{m}</Badge>)}</span></li>)}</ul>
            : <p className="text-sm text-muted-foreground">Every running bus has a driver and a conductor.</p>}
        </LinkCard>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Buses running" value={x.buses.running} hint={`${x.buses.total} in total${x.buses.maintenance ? ` · ${x.buses.maintenance} in maintenance` : ''}`} to={buses} />
        <StatCard label="Students ride" value={x.riders.toLocaleString('en-IN')} hint={x.occupancy != null ? `${x.occupancy}% of seats taken · ${x.seatsFree} free` : undefined} to={buses} />
        <StatCard label="Transport staff" value={x.staff.total} hint={x.staff.byDesignation.filter((s) => s.count).map((s) => `${s.count} ${s.name}`).join(' · ') || 'None added yet'} />
        <StatCard label="Needs attention" value={x.needsCrew.length + x.alerts.length} hint={`${x.needsCrew.length} short of crew · ${x.alerts.length} certificates`} />
      </div>

      <RoutesPanel base={base} buses={buses} />

      {x.fullBuses.length > 0 && (
        <ChartCard title="Busiest buses" description="Riders against seats (seats in grey)" height={240}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={x.fullBuses.map((b) => ({ bus: b.busNo, Riders: b.riders, Seats: b.capacity }))} margin={{ left: -12 }}>
            <CartesianGrid {...gridProps} /><XAxis dataKey="bus" {...axisProps} /><YAxis allowDecimals={false} {...axisProps} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--c-muted))' }} />
            <Bar dataKey="Seats" fill={chartColor.neutral} radius={[6, 6, 0, 0]} maxBarSize={32} {...motion} />
            <Bar dataKey="Riders" fill={chartColor.primary} radius={[6, 6, 0, 0]} maxBarSize={32} {...motion} />
          </BarChart></ResponsiveContainer>
        </ChartCard>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-3" aria-labelledby="cert-h"><h2 id="cert-h" className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Bus className="size-4 text-muted-foreground" aria-hidden />Certificates and licences</h2>
          <DataTable columns={certCols} data={certView === 'all' ? x.certificates : x.certificates.filter((c) => c.state !== 'valid')} getRowId={(r) => `${r.busId}-${r.doc}`} searchPlaceholder="Search by bus number" pageSize={10}
            toolbar={<Segmented label="Show" value={certView} onChange={setCertView} options={[{ value: 'all', label: 'All' }, { value: 'attention', label: 'Needs attention' }]} />}
            emptyTitle={certView === 'all' ? 'No certificates to show' : 'Every certificate is valid'} emptyDescription={certView === 'all' ? 'Add buses to see their insurance, fitness, pollution and driver licence dates here.' : undefined} caption="Certificates and licences of every bus" /></section>
        <section className="space-y-3" aria-labelledby="idle-h"><h2 id="idle-h" className="text-lg font-semibold tracking-tight">Crew not on a bus</h2>
          <DataTable columns={idleCols} data={x.idleCrew} getRowId={(r) => r.staffId} searchable={false} pageSize={6} emptyTitle="Everyone is on a bus" caption="Drivers and conductors without a bus" /></section>
      </div>
      {buses && <p className="text-sm"><Link to={buses} className="font-medium text-primary-ink hover:underline">Manage buses and riders</Link></p>}
    </div>
  );
}
