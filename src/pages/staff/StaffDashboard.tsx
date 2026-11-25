import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ClipboardCheck, MessageCircle, PlaneTakeoff, Users, type LucideIcon } from 'lucide-react';
import { useGet } from '../../api/query';
import { LinkCard } from '../../design/patterns';
import { Badge, Button, Card, CardHeader, CardTitle, ErrorState, PageHeader, PageSkeleton } from '../../design/ui';
import { fmtDate } from '../../components/ui.jsx';

interface Register { group: string; name: string; people: number; present: number; absent: number; leave: number; submitted: boolean; blocked: string | null }
interface Dash { today: string; name: string; designation?: string; registers: Register[]; pendingStaffLeave: number; pendingTeacherLeave: number; openQueries: number }
const S = '/api/staff';

/** The office desk at a glance: where today's registers stand, what waits for a decision, and the queries teachers have sent. */
export default function StaffDashboard() {
  const { data: x, error, refetch } = useGet<Dash>(`${S}/dashboard`);
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!x) return <PageSkeleton />;
  const open = x.registers.filter((r) => !r.submitted && !r.blocked);
  const queue: { label: string; note: string; count: number; to?: string; action: string; icon: LucideIcon }[] = [
    { label: 'Attendance registers not taken yet', note: open.map((r) => r.name).join(', '), count: open.length, to: '/staff/attendance-desk', action: 'Open', icon: ClipboardCheck },
    { label: 'Non-teaching leave waiting', note: 'Staff are waiting for an answer', count: x.pendingStaffLeave, to: '/staff/leave', action: 'Review', icon: PlaneTakeoff },
    { label: 'Queries from teachers', note: 'Open questions for the office', count: x.openQueries, to: '/staff/queries', action: 'Answer', icon: MessageCircle },
    { label: 'Teacher leave waiting', note: 'The School Admin decides these', count: x.pendingTeacherLeave, action: '', icon: PlaneTakeoff },
  ].filter((q) => q.count > 0);
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
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader><CardTitle>Desk queue</CardTitle><span className="text-[13px] tabular-nums text-muted-foreground">{queue.length ? `${queue.length} open` : 'All clear'}</span></CardHeader>
          {queue.length === 0 ? <div className="flex items-center gap-3 px-5 py-6 text-sm text-muted-foreground"><CheckCircle2 className="size-5 text-success-ink" aria-hidden />Nothing is waiting at the desk.</div> : (
            <ul className="px-5 pb-2">
              {queue.map((q) => (
                <li key={q.label} className="flex items-center gap-3.5 border-t border-border py-3 first:border-t-0">
                  <span className="grid size-[38px] flex-none place-items-center rounded-xl bg-tone-soft text-tone-ink"><q.icon className="size-[19px]" strokeWidth={1.7} aria-hidden /></span>
                  <div className="min-w-0 flex-1"><p className="font-medium leading-snug">{q.label}</p><p className="text-[13px] text-muted-foreground">{q.note}</p></div>
                  <span className="min-w-[30px] text-right text-xl font-semibold tabular-nums">{q.count}</span>
                  {q.to ? <Button asChild size="sm" variant="secondary"><Link to={q.to} aria-label={`${q.action}: ${q.label}`}>{q.action}</Link></Button> : <Badge tone="neutral">Admin decides</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="xl:col-span-5">
          <CardHeader><CardTitle>Quick tools</CardTitle></CardHeader>
          <div className="grid grid-cols-2 gap-2 p-5">
            {[[PlaneTakeoff, 'Record a leave', '/staff/leave'], [MessageCircle, 'Answer a query', '/staff/queries'], [CalendarDays, 'School calendar', '/staff/calendar'], [Users, 'Employee list', '/staff/employees']].map(([Icon, label, to]) => {
              const I = Icon as typeof Users;
              return <Link key={to as string} to={to as string} className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-3 text-[13.5px] font-medium transition-colors hover:border-transparent hover:bg-tone-soft hover:text-tone-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><I className="size-[18px]" strokeWidth={1.7} aria-hidden />{label as string}</Link>;
            })}
          </div>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">Look someone up in the <Link to="/staff/employees" className="font-medium text-primary-ink hover:underline">employee list</Link>.</p>
    </div>
  );
}
