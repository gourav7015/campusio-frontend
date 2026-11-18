import { Link } from 'react-router-dom';
import { Award, CalendarCheck2, CalendarClock, Flame, NotebookPen, Sparkles, Trophy } from 'lucide-react';
import { useGet } from '../../api/query';
import { Badge, EmptyState, ErrorState, PageSkeleton, ProgressRing } from '../../design/ui';
import { LinkCard, ShareList } from '../../design/patterns';
import { cn } from '../../design/lib/cn';
import { DaySchedule, type Period } from '../../components/Schedule';
import { fmtDate, fmtMoney } from '../../components/ui.jsx';
import { StudentHero } from './StudentHero';

interface Dash {
  welcome: { name: string; date: string; className: string; section: string; academicYear: string; enrolmentStatus: string };
  cards: { attendance: number | null; pendingHomework: number; completedExams: number; latestAverage: number | null; latestExam?: string };
  overdueHomework?: number;
  toDo?: { remarksToAcknowledge: number; unreadChats: number };
  timetable: { rows: Period[] };
  attendance: { summary: { workingDays: number; present: number; absent: number; leave: number; late?: number; percentage: number | null } };
  homework: { _id: string; subject: string; title: string; state: string; dueDate: string }[];
  upcomingExam?: { exam: string; subject: string; date: string; daysLeft: number };
  latestResult?: { exam: string; percentage: number; grade: string; resultStatus: string; subjects: { subject: string; percentage: number | null; grade?: string }[] };
  fees?: { pending: number; overdue: number };
  library: { onLoan: number; overdue: number };
  announcements: { _id: string; title: string; read: boolean; category: string; createdAt: string }[];
  calendar: { source: string; id: string; title: string; date: string; type: string }[];
}
interface Heat { days: { date: string; status: string | null; working: boolean }[] }

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const label = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Consecutive recorded school days present or late, counting back from the latest recorded day. Unrecorded days do not break it; an absence does. */
export function streakOf(days: Heat['days'] | undefined) {
  let n = 0;
  for (const d of [...(days ?? [])].reverse()) {
    if (!d.working || d.status == null) continue;
    if (d.status === 'present' || d.status === 'late') n += 1;
    else if (d.status === 'absent') break;
  }
  return n;
}

export default function StudentDashboard() {
  const { data: x, error, refetch } = useGet<Dash>('/api/student/dashboard');
  const { data: heat } = useGet<Heat>('/api/student/attendance/heatmap');
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!x) return <PageSkeleton />;

  const att = x.cards.attendance;
  const streak = streakOf(heat?.days);
  const pending = x.cards.pendingHomework; const overdue = x.overdueHomework ?? 0;
  // Achievements are worked out from the student's own records; nothing is stored or compared with other students.
  const badges = [
    { id: 'att', title: '95% attendance', hint: 'Keep attendance at 95% or more', icon: CalendarCheck2, earned: att != null && att >= 95 },
    { id: 's5', title: '5-day streak', hint: 'Five school days in a row', icon: Flame, earned: streak >= 5 },
    { id: 's10', title: '10-day streak', hint: 'Ten school days in a row', icon: Flame, earned: streak >= 10 },
    { id: 'hw', title: 'Homework up to date', hint: 'No pending or overdue homework', icon: NotebookPen, earned: pending === 0 && overdue === 0 },
    { id: 'res', title: 'Result 75% or more', hint: 'Latest published result', icon: Trophy, earned: (x.cards.latestAverage ?? 0) >= 75 },
  ];
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-6">
      <StudentHero name={x.welcome.name} greeting={greeting()} dateLabel={new Date(x.welcome.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        classLabel={`${x.welcome.className} ${x.welcome.section}`} year={x.welcome.academicYear} status={x.welcome.enrolmentStatus === 'active' ? undefined : label(x.welcome.enrolmentStatus)} />
      {x.toDo && (x.toDo.remarksToAcknowledge > 0 || x.toDo.unreadChats > 0) && (
        <div role="status" className="flex flex-wrap gap-3">
          {x.toDo.remarksToAcknowledge > 0 && <Link to="/student/remarks" className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm font-medium text-warning-ink hover:underline">{x.toDo.remarksToAcknowledge} teacher remark{x.toDo.remarksToAcknowledge === 1 ? '' : 's'} waiting for you to read and acknowledge</Link>}
          {x.toDo.unreadChats > 0 && <Link to="/student/chats" className="rounded-lg border border-primary/20 bg-primary-soft px-4 py-3 text-sm font-medium text-primary-ink hover:underline">{x.toDo.unreadChats} new message{x.toDo.unreadChats === 1 ? '' : 's'} from a teacher</Link>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link to="/student/attendance" className="group flex items-center gap-4 rounded-lg border border-border/70 bg-card p-4 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {att != null ? <ProgressRing value={att} size={64} stroke={7} tone={att >= 90 ? 'success' : att >= 75 ? 'primary' : 'warning'} label={`Attendance ${att} percent`} />
            : <div className="grid size-16 place-items-center rounded-full bg-muted text-xl text-muted-foreground" aria-hidden>—</div>}
          <div className="min-w-0"><p className="text-[13px] text-muted-foreground">Attendance</p><p className="text-sm font-medium">{att == null ? 'No attendance recorded yet' : streak ? `${streak}-day streak` : 'This year'}</p></div>
        </Link>
        <Link to="/student/homework" className="rounded-lg border border-border/70 bg-card p-4 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <p className="text-[13px] text-muted-foreground">Homework to do</p><p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{pending}</p>
          <p className="mt-1 text-xs text-muted-foreground">{overdue ? <span className="text-danger-ink">{overdue} overdue</span> : pending ? 'Nothing overdue' : 'All done'}</p>
        </Link>
        <Link to="/student/exams" className="rounded-lg border border-border/70 bg-card p-4 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <p className="text-[13px] text-muted-foreground">Next exam</p>
          {x.upcomingExam ? <><p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{x.upcomingExam.daysLeft === 0 ? 'Today' : <>{x.upcomingExam.daysLeft}<span className="text-base font-normal text-muted-foreground"> {x.upcomingExam.daysLeft === 1 ? 'day' : 'days'}</span></>}</p><p className="mt-1 truncate text-xs text-muted-foreground">{x.upcomingExam.subject} · {fmtDate(x.upcomingExam.date)}</p></>
            : <><p className="mt-1 text-3xl font-semibold tracking-tight">—</p><p className="mt-1 text-xs text-muted-foreground">None scheduled</p></>}
        </Link>
        <Link to="/student/results" className="rounded-lg border border-border/70 bg-card p-4 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <p className="text-[13px] text-muted-foreground">Latest result</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{x.cards.latestAverage != null ? `${x.cards.latestAverage}%` : '—'}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{x.cards.latestExam || 'None published yet'}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <LinkCard className="xl:col-span-2" title="Today" to="/student/timetable" linkLabel="Full timetable"><DaySchedule rows={x.timetable.rows} showTeacher empty="No classes today" /></LinkCard>
        <LinkCard title="Homework" to="/student/homework" linkLabel="All">
          {x.homework.length ? <ul className="space-y-3">{x.homework.map((h) => (
            <li key={h._id} className="flex items-start justify-between gap-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{h.title}</p><p className="text-xs text-muted-foreground">{h.subject}</p></div><Badge tone={h.state === 'overdue' ? 'danger' : 'neutral'}>{h.state === 'overdue' ? 'Overdue' : fmtDate(h.dueDate)}</Badge></li>))}</ul>
            : <EmptyState icon={Sparkles} title="No homework pending" description="You are all caught up." className="py-6" />}
        </LinkCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <LinkCard title={x.latestResult ? `Result · ${x.latestResult.exam}` : 'Latest result'} to={x.latestResult ? '/student/results' : undefined} linkLabel="Full result">
          {x.latestResult ? (
            <div>
              <div className="mb-4 flex items-baseline gap-3"><span className="text-3xl font-semibold tabular-nums tracking-tight">{x.latestResult.percentage}%</span><Badge tone="primary">Grade {x.latestResult.grade}</Badge></div>
              <ShareList total={100} items={x.latestResult.subjects.filter((s) => s.percentage != null).map((s) => ({ label: s.subject, value: Math.round(s.percentage as number), tone: 'primary' as const }))} />
            </div>
          ) : <EmptyState icon={Award} title="No published results yet" className="py-6" />}
        </LinkCard>
        <LinkCard title="Achievements" to={undefined}>
          <p className="mb-3 text-sm text-muted-foreground">{earned} of {badges.length} earned. Worked out from your own records.</p>
          <ul className="grid grid-cols-1 gap-2">
            {badges.map((b) => (
              <li key={b.id} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2', b.earned ? 'border-primary/25 bg-primary-soft' : 'border-border/70')}>
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', b.earned ? 'bg-primary text-primary-foreground' : 'bg-muted text-subtle')} aria-hidden><b.icon className="size-4" strokeWidth={1.75} /></span>
                <span className="min-w-0 flex-1"><span className={cn('block text-sm font-medium', !b.earned && 'text-muted-foreground')}>{b.title}</span><span className="block truncate text-xs text-muted-foreground">{b.earned ? 'Earned' : b.hint}</span></span>
              </li>))}
          </ul>
        </LinkCard>
        <div className="space-y-6">
          <LinkCard title="Announcements" to="/student/announcements" linkLabel="All">
            {x.announcements.length ? <ul className="space-y-3">{x.announcements.slice(0, 4).map((a) => <li key={a._id} className="flex items-start justify-between gap-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{label(a.category)} · {fmtDate(a.createdAt)}</p></div>{!a.read && <Badge tone="primary">New</Badge>}</li>)}</ul> : <p className="text-sm text-muted-foreground">No announcements.</p>}
          </LinkCard>
          <LinkCard title="Coming up" to="/student/calendar" linkLabel="Calendar">
            {x.calendar.length ? <ul className="space-y-2.5">{x.calendar.slice(0, 4).map((c) => <li key={c.source + c.id} className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2"><CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden /><span className="truncate">{c.title}</span></span><span className="shrink-0 text-xs text-muted-foreground">{fmtDate(c.date)}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
          </LinkCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <LinkCard title="Fees" to="/student/fees" linkLabel="Details">
          {x.fees ? <div className="flex gap-10"><div><p className="text-[13px] text-muted-foreground">Pending</p><p className="text-xl font-semibold tabular-nums">{fmtMoney(x.fees.pending)}</p></div><div><p className="text-[13px] text-muted-foreground">Overdue</p><p className={cn('text-xl font-semibold tabular-nums', x.fees.overdue ? 'text-danger-ink' : '')}>{fmtMoney(x.fees.overdue)}</p></div></div> : <p className="text-sm text-muted-foreground">No fees assigned yet.</p>}
        </LinkCard>
        <LinkCard title="Library" to="/student/library" linkLabel="My books">
          <div className="flex gap-10"><div><p className="text-[13px] text-muted-foreground">On loan</p><p className="text-xl font-semibold tabular-nums">{x.library.onLoan}</p></div><div><p className="text-[13px] text-muted-foreground">Overdue</p><p className={cn('text-xl font-semibold tabular-nums', x.library.overdue ? 'text-danger-ink' : '')}>{x.library.overdue}</p></div></div>
        </LinkCard>
      </div>
    </div>
  );
}
