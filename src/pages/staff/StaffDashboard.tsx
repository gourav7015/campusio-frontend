import { Link } from 'react-router-dom';
import { useGet } from '../../api/query';
import { LinkCard } from '../../design/patterns';
import { Badge, ErrorState, PageHeader, PageSkeleton, StatCard } from '../../design/ui';
import { fmtDate } from '../../components/ui.jsx';

interface Register { group: string; name: string; people: number; present: number; absent: number; leave: number; submitted: boolean; blocked: string | null }
interface Dash { today: string; name: string; designation?: string; registers: Register[]; pendingStaffLeave: number; pendingTeacherLeave: number; openQueries: number }
const S = '/api/staff';

/** The office desk at a glance: where today's registers stand, what waits for a decision, and the queries teachers have sent. */
export default function StaffDashboard() {
  const { data: x, error, refetch } = useGet<Dash>(`${S}/dashboard`);
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!x) return <PageSkeleton />;
  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${x.name}`} description={`${x.designation || 'Office desk'} · ${fmtDate(x.today, true)}`} />
      <LinkCard title="Today's attendance" to="/staff/attendance-desk" linkLabel="Open the attendance desk">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {x.registers.map((r) => (
            <div key={r.group} className="rounded-lg border border-border/70 p-4">
              <div className="flex items-center justify-between gap-2"><p className="font-medium">{r.name}</p>
                {r.blocked ? <Badge tone="neutral">{r.blocked.startsWith('holiday') ? 'Holiday' : 'Not a working day'}</Badge> : <Badge tone={r.submitted ? 'success' : 'warning'} dot>{r.submitted ? 'Taken' : 'Not taken yet'}</Badge>}</div>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{r.people}</p>
              <p className="text-xs text-muted-foreground">{r.submitted ? `${r.present} present · ${r.absent} absent · ${r.leave} on leave` : 'people on this register'}</p>
            </div>))}
        </div>
      </LinkCard>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Non-teaching leave waiting" value={x.pendingStaffLeave} to="/staff/leave" />
        <StatCard label="Teacher leave waiting (School Admin decides)" value={x.pendingTeacherLeave} />
        <StatCard label="Queries from teachers" value={x.openQueries} hint="open" to="/staff/queries" />
      </div>
      <p className="text-sm text-muted-foreground">Look someone up in the <Link to="/staff/employees" className="font-medium text-primary-ink hover:underline">employee list</Link>.</p>
    </div>
  );
}
