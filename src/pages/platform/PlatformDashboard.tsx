import { Link, useNavigate } from 'react-router-dom';
import { Building2, CalendarClock, TimerOff } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useGet } from '../../api/query';
import { AttentionList, LinkCard, ShareList } from '../../design/patterns';
import { Badge, Button, DataTable, ErrorState, PageHeader, PageSkeleton, Progress, StatCard, type BadgeTone } from '../../design/ui';

interface Stats { schools: number; activeSchools: number; students: number; teachers: number; schoolAdmins: number; subscriptions: { trial: number; active: number; expired: number; expiringSoon: number } }
interface School { _id: string; name: string; code: string; status: string; studentCount: number; teacherCount: number; subscription?: { plan: string; status: string; studentLimit: number; teacherLimit: number; expiresOn?: string } | null }

const tone = (s?: string): BadgeTone => (s === 'active' ? 'success' : s === 'trial' ? 'warning' : s === 'expired' || s === 'cancelled' || s === 'suspended' || s === 'archived' ? 'danger' : 'neutral');
const usage = (n: number, limit?: number) => (
  <div className="min-w-28"><div className="mb-1 flex justify-between text-xs tabular-nums"><span>{n.toLocaleString('en-IN')}</span><span className="text-muted-foreground">of {limit?.toLocaleString('en-IN') ?? '—'}</span></div><Progress value={limit ? (n / limit) * 100 : 0} label="Plan usage" className="h-1.5" /></div>
);

const columns: ColumnDef<School>[] = [
  { id: 'name', header: 'School', accessorFn: (s) => s.name, cell: (c) => <div><p className="font-medium">{c.row.original.name}</p><p className="text-xs text-muted-foreground">{c.row.original.code}</p></div> },
  { id: 'students', header: 'Students', accessorFn: (s) => s.studentCount, cell: (c) => usage(c.row.original.studentCount, c.row.original.subscription?.studentLimit), meta: { hideBelow: 'sm' } },
  { id: 'teachers', header: 'Teachers', accessorFn: (s) => s.teacherCount, cell: (c) => usage(c.row.original.teacherCount, c.row.original.subscription?.teacherLimit), meta: { hideBelow: 'md' } },
  { id: 'plan', header: 'Plan', accessorFn: (s) => s.subscription?.plan ?? '', cell: (c) => <Badge tone={tone(c.row.original.subscription?.status)} dot>{c.row.original.subscription?.plan ?? 'none'} · {c.row.original.subscription?.status ?? '—'}</Badge>, meta: { hideBelow: 'md' } },
  { id: 'status', header: 'Status', accessorFn: (s) => s.status, cell: (c) => <Badge tone={tone(c.row.original.status)}>{c.row.original.status}</Badge> },
];

export default function PlatformDashboard() {
  const nav = useNavigate();
  const stats = useGet<Stats>('/api/platform/stats');
  const schools = useGet<School[]>('/api/platform/schools');
  if (stats.error) return <ErrorState error={stats.error} onRetry={() => stats.refetch()} />;
  if (!stats.data) return <PageSkeleton />;
  const s = stats.data;
  const sub = s.subscriptions;
  const hold = (schools.data ?? []).filter((x) => x.status !== 'active').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Every school on the platform" actions={<Button variant="primary" asChild><Link to="/platform/schools"><Building2 />Manage schools</Link></Button>} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><AttentionList items={[
          { label: 'Subscriptions expiring within 30 days', count: sub.expiringSoon, to: '/platform/schools', icon: CalendarClock },
          { label: 'Expired subscriptions', count: sub.expired, to: '/platform/schools', icon: TimerOff, tone: 'danger' },
          { label: 'Schools suspended or archived', count: hold, to: '/platform/schools', icon: Building2, tone: 'neutral' },
        ]} /></div>
        <LinkCard title="Subscriptions" to="/platform/schools" linkLabel="Schools">
          <ShareList items={[{ label: 'Paid', value: sub.active, tone: 'success' }, { label: 'On trial', value: sub.trial, tone: 'warning' }, { label: 'Expired', value: sub.expired, tone: 'danger' }]} />
        </LinkCard>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Schools" value={s.schools} hint={`${s.activeSchools} active`} to="/platform/schools" />
        <StatCard label="Active students" value={s.students.toLocaleString('en-IN')} to="/platform/schools" />
        <StatCard label="Active teachers" value={s.teachers.toLocaleString('en-IN')} to="/platform/schools" />
        <StatCard label="School admins" value={s.schoolAdmins} to="/platform/schools" />
      </div>

      <section className="space-y-3" aria-labelledby="sch-h">
        <div className="flex items-center justify-between"><h2 id="sch-h" className="text-lg font-semibold tracking-tight">Schools</h2><Link to="/platform/schools" className="text-[13px] font-medium text-primary-ink hover:underline">All schools</Link></div>
        <DataTable columns={columns} data={schools.data} loading={schools.isLoading} error={schools.error} onRetry={() => schools.refetch()} getRowId={(r) => r._id} onRowClick={(r) => nav(`/platform/schools/${r._id}`)} pageSize={8} searchPlaceholder="Search schools" emptyTitle="No schools yet" caption="Schools on the platform" />
      </section>
    </div>
  );
}
