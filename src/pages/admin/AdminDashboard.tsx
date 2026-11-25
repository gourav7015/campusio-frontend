import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { BookMarked, BookOpen, CalendarX2, CheckCircle2, ClipboardCheck, Mail, Megaphone, Plus, PlaneTakeoff, UserX, type LucideIcon } from 'lucide-react';
import { useGet } from '../../api/query';
import { axisProps, ChartCard, ChartTooltip, chartColor, gridProps, useChartMotion } from '../../design/charts';
import { LinkCard, Money } from '../../design/patterns';
import { Button, Card, ErrorState, PageHeader, PageSkeleton, StatCard } from '../../design/ui';
import { useSession } from '../../types/auth';
import { fmtDateTime, fmtMoney } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { cn } from '../../design/lib/cn';

interface Recent { id: string; at: string; actor: string; actingAsSuperAdmin?: boolean; summary: string }
interface Dashboard {
  today: string; year?: { name: string };
  coverage?: { sectionsWithoutClassTeacher: number; subjectsWithoutTeacher: number; classesWithoutSubjects: number } | null;
  cards: { students: number; teachers: number; sections: number; pendingLeave: number; unreadMessages: number; unresolvedPeriods: number };
  attendance: { students: number; present: number; absent: number; late: number; half_day?: number; leave: number; excused: number; pending: number; submitted: number; sections: number };
  attendanceTrend: { date: string; percentage: number }[];
  exams: { total: number; awaitingReview: number; approved: number; published: number; returned: number };
  finance: { collectedMonth: number; pending: number; overdue: number };
  library: { onLoan: number; overdue: number };
  recent: Recent[];
}

/** 2026-11-24 as "Tuesday, 24 November 2026" */
const longDay = (v: string) => { const d = new Date(`${v}T00:00:00Z`); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
const day = (v: string) => { const [, m, d] = v.split('-'); return `${Number(d)} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1]}`; };
interface SectionRow { sectionId: string; className: string; section: string; status?: string; totals?: { present: number; late: number; absent: number } }
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const STREAM_SHORT: Record<string, string> = { medical: 'Med', 'non-medical': 'NM', 'non medical': 'NM', commerce: 'Com', arts: 'Arts' };
/** "Class 8" + "A" becomes "8A"; in Classes 11 and 12 the stream is kept ("Class 11 Commerce" + "A" becomes "11A" with "Com" under it), so the four streams are not four identical tiles. */
const tileParts = (r: SectionRow) => {
  const m = r.className.match(/^Class\s+(\d+)\s*(.*)$/i);
  if (m) return { n: `${m[1]}${r.section}`, s: m[2] ? STREAM_SHORT[m[2].toLowerCase()] ?? m[2].slice(0, 3) : '' };
  return { n: `${r.className.length > 3 ? r.className.slice(0, 2) : r.className}${r.section}`, s: '' };
};

interface Need { label: string; note: string; count: number; to: string; icon: LucideIcon; tone?: 'danger' | 'warning' | 'neutral' | 'primary'; action: string }
const tile = { danger: 'bg-danger-soft text-danger-ink', warning: 'bg-warning-soft text-warning-ink', neutral: 'bg-muted text-muted-foreground', primary: 'bg-primary-soft text-primary-ink' } as const;

/** What is waiting for the School Admin, most blocking first. Only things with a count show. */
function NeedsYou({ items }: { items: Need[] }) {
  const open = items.filter((i) => i.count > 0);
  return (
    <Card className="xl:col-span-7">
      <div className="flex items-start justify-between gap-3 px-[22px] pb-4 pt-[22px]">
        <div><h3 className="text-[15px] font-semibold tracking-tight">Needs you today</h3><p className="mt-0.5 text-[13px] text-muted-foreground">{open.length ? 'Sorted by what is blocking people most' : 'Nothing is waiting for you'}</p></div>
        <Link to="/admin/approvals" className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[13.5px] font-medium text-primary-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">All approvals ›</Link>
      </div>
      {open.length === 0 ? (
        <div className="flex items-center gap-3 px-[22px] pb-6 text-sm text-muted-foreground"><CheckCircle2 className="size-5 text-success-ink" aria-hidden />Nothing needs your attention right now.</div>
      ) : (
        <ul className="px-[22px] pb-3">
          {open.map((i) => (
            <li key={i.label} className="flex items-center gap-3.5 border-t border-border py-[13px] first:border-t-0 first:pt-0">
              <span className={cn('grid size-[38px] flex-none place-items-center rounded-xl', tile[i.tone ?? 'primary'])}><i.icon className="size-[19px]" strokeWidth={1.7} aria-hidden /></span>
              <div className="min-w-0 flex-1"><p className="font-medium leading-snug">{i.label}</p><p className="truncate text-[13px] text-muted-foreground">{i.note}</p></div>
              <span className="min-w-[34px] text-right text-xl font-semibold tabular-nums tracking-tight">{i.count}</span>
              <Button asChild size="sm" variant="secondary"><Link to={i.to} aria-label={`${i.action}: ${i.label}`}>{i.action}</Link></Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** The share of today's students who are present, as a ring. */
function Ring({ pct }: { pct: number | null }) {
  const r = 54; const c = 2 * Math.PI * r;
  return (
    <div className="relative size-[132px] flex-none" role="img" aria-label={pct == null ? 'No attendance marked yet' : `${pct}% present`}>
      <svg viewBox="0 0 132 132" className="size-full -rotate-90" aria-hidden>
        <circle cx="66" cy="66" r={r} fill="none" strokeWidth="12" className="stroke-muted" />
        {pct != null && <circle cx="66" cy="66" r={r} fill="none" strokeWidth="12" strokeLinecap="round" className="stroke-success" strokeDasharray={`${(c * pct) / 100} ${c}`} />}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center"><b className="text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{pct == null ? '—' : `${pct}%`}</b><span className="mt-1 text-xs text-muted-foreground">present</span></div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useSession();
  const { data: x, error, refetch } = useGet<Dashboard>('/api/school/dashboard');
  const reg = useApi('/api/school/attendance/overview', {});
  const motion = useChartMotion();
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!x) return <PageSkeleton />;

  const a = x.attendance;
  const marked = a.present + a.late + a.absent + (a.half_day ?? 0) + a.leave + a.excused;
  const rate = marked ? Math.round(((a.present + a.late) / marked) * 1000) / 10 : null;
  const hour = new Date().getHours();
  const first = String((user as { name?: string } | null)?.name || '').split(' ')[0];
  const hello = `${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}${first ? `, ${first}` : ''}`;
  const sections: SectionRow[] = (reg.data as unknown as { rows?: SectionRow[] } | null)?.rows ?? [];
  const waiting = sections.filter((s) => s.status !== 'submitted');
  const ex = x.exams;
  const exTotal = ex.awaitingReview + ex.approved + ex.published + ex.returned;
  const seg = (n: number) => (exTotal ? `${(n / exTotal) * 100}%` : '0%');

  return (
    <div className="dash-look space-y-6">
      <PageHeader title={hello} description={`${longDay(x.today)} · Academic year ${x.year?.name || 'not set yet'}`}
        actions={<><Button asChild variant="secondary"><Link to="/admin/announcements"><Megaphone aria-hidden />Announcement</Link></Button><Button asChild><Link to="/admin/students"><Plus aria-hidden />Add student</Link></Button></>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active students" value={x.cards.students.toLocaleString('en-IN')} to="/admin/students" />
        <StatCard label="Active teachers" value={x.cards.teachers.toLocaleString('en-IN')} to="/admin/employees" />
        <StatCard label="Attendance today" value={rate == null ? '—' : `${rate}%`} hint={rate == null ? 'No register submitted yet' : `${marked.toLocaleString('en-IN')} students marked`} to="/admin/attendance" />
        <StatCard label="Fees pending" value={<Money amount={x.finance.pending} />} hint={x.finance.overdue ? `${fmtMoney(x.finance.overdue)} overdue` : 'None overdue'} to="/admin/fees?tab=students" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <NeedsYou items={[
          { label: 'Mark sheets waiting for review', note: 'Teachers have sent marks for you to approve', count: x.exams.awaitingReview, to: '/admin/exams', icon: ClipboardCheck, tone: 'primary', action: 'Review' },
          { label: 'Sections with no class teacher', note: 'Their attendance has nobody to take it', count: x.coverage?.sectionsWithoutClassTeacher ?? 0, to: '/admin/class-structure', icon: UserX, tone: 'danger', action: 'Assign' },
          { label: 'Subjects with no teacher in a section', note: 'A period for these subjects cannot run', count: x.coverage?.subjectsWithoutTeacher ?? 0, to: '/admin/class-structure', icon: UserX, tone: 'danger', action: 'Assign' },
          { label: 'Attendance registers not submitted today', note: waiting.length ? `${waiting.slice(0, 4).map((w) => `${w.className.replace(/^Class\s+/i, '')}-${w.section}`).join(', ')}${waiting.length > 4 ? ` and ${waiting.length - 4} more` : ''}` : 'Class teachers have not sent today\'s register', count: a.pending, to: '/admin/attendance', icon: ClipboardCheck, tone: 'warning', action: 'Open' },
          { label: 'Leave applications to review', note: 'Staff and students are waiting for an answer', count: x.cards.pendingLeave, to: '/admin/leave', icon: PlaneTakeoff, tone: 'primary', action: 'Review' },
          { label: 'Timetable periods with no teacher', note: 'Open the timetable to fill them', count: x.cards.unresolvedPeriods, to: '/admin/timetable', icon: CalendarX2, tone: 'danger', action: 'Fix' },
          { label: 'Classes with no subjects set up', note: 'Choose their subjects for this year', count: x.coverage?.classesWithoutSubjects ?? 0, to: '/admin/class-structure', icon: BookOpen, tone: 'warning', action: 'Set up' },
          { label: 'Unread messages', note: 'From teachers, parents and students', count: x.cards.unreadMessages, to: '/admin/messages', icon: Mail, tone: 'neutral', action: 'Read' },
          { label: 'Overdue library books', note: 'Books past their due date', count: x.library.overdue, to: '/admin/library?tab=loans', icon: BookMarked, tone: 'neutral', action: 'View' },
        ]} />
        <LinkCard className="xl:col-span-5" title="Today's registers" to="/admin/attendance" linkLabel="Open">
          <p className="mb-4 text-sm text-muted-foreground"><span className="font-semibold text-foreground tabular-nums">{a.submitted}</span> of <span className="tabular-nums">{a.sections}</span> sections have submitted attendance</p>
          <div className="flex items-center gap-5">
            <Ring pct={rate} />
            <ul className="grid flex-1 gap-2 text-sm">
              {[['Present', a.present, 'bg-success'], ['Late', a.late, 'bg-warning'], ['Absent', a.absent, 'bg-danger'], ['On leave', a.leave + a.excused, 'bg-border-strong']].map(([l, v, c]) => (
                <li key={l as string} className="flex items-center gap-2.5"><i className={cn('size-2.5 rounded-[3px]', c as string)} aria-hidden />{l}<b className="ml-auto font-semibold tabular-nums">{(v as number).toLocaleString('en-IN')}</b></li>
              ))}
            </ul>
          </div>
          {sections.length > 0 && (<>
            <ul aria-label="Section registers" className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(34px,1fr))] gap-[5px]">
              {sections.map((s) => { const done = s.status === 'submitted'; return (
                <li key={s.sectionId}><Link to="/admin/attendance" title={`${s.className} ${s.section}: ${done ? 'submitted' : 'waiting'}`} aria-label={`${s.className} ${s.section}: ${done ? 'submitted' : 'waiting'}`}
                  className={cn('flex aspect-square flex-col items-center justify-center rounded-[8px] text-[10.5px] leading-none font-semibold transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', done ? 'bg-success-soft text-success-ink' : 'bg-warning-soft text-warning-ink ring-1 ring-inset ring-warning')}><span>{tileParts(s).n}</span>{tileParts(s).s && <span className="mt-px text-[8.5px] font-medium leading-none opacity-80">{tileParts(s).s}</span>}</Link></li>
              ); })}
            </ul>
            <p className="mt-3 flex gap-4 text-[12.5px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-success-soft ring-1 ring-success" aria-hidden />Submitted ({sections.length - waiting.length})</span><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-warning-soft ring-1 ring-warning" aria-hidden />Waiting ({waiting.length})</span></p>
          </>)}
        </LinkCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <ChartCard className="xl:col-span-8" title="Attendance, last 14 days" description="Share of marked students present or late" to="/admin/attendance" height={280}>
          {x.attendanceTrend?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={x.attendanceTrend} margin={{ left: -12, right: 8, top: 4 }}>
                <CartesianGrid {...gridProps} /><XAxis dataKey="date" tickFormatter={day} {...axisProps} /><YAxis domain={[0, 100]} unit="%" {...axisProps} />
                <Tooltip content={<ChartTooltip format={(v) => `${v}%`} />} labelFormatter={day} cursor={{ stroke: chartColor.neutral }} />
                <Area type="monotone" dataKey="percentage" name="Attendance" stroke={chartColor.primary} strokeWidth={2} fill={chartColor.primary} fillOpacity={0.08} {...motion} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="grid h-full place-items-center text-sm text-muted-foreground">Not enough days recorded yet</p>}
        </ChartCard>
        <LinkCard className="xl:col-span-4" title="Fees this month" to="/admin/fees" linkLabel="Open">
          <p className="text-[30px] font-semibold leading-tight tracking-[-0.03em] tabular-nums">{fmtMoney(x.finance.collectedMonth)}</p>
          <p className="mb-5 mt-1 text-[13px] text-muted-foreground">collected so far</p>
          <ul className="grid gap-3 text-sm">
            <li className="flex items-center gap-2.5"><i className="size-2.5 rounded-[3px] bg-warning" aria-hidden />Pending<b className="ml-auto font-semibold tabular-nums">{fmtMoney(x.finance.pending)}</b></li>
            <li className="flex items-center gap-2.5"><i className="size-2.5 rounded-[3px] bg-danger" aria-hidden />Overdue<b className="ml-auto font-semibold tabular-nums">{fmtMoney(x.finance.overdue)}</b></li>
          </ul>
        </LinkCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <LinkCard className="xl:col-span-6" title="Examinations" to="/admin/exams" linkLabel="Open">
          <p className="mb-3 text-[13px] text-muted-foreground">Where this year's mark sheets are ({ex.total} exams)</p>
          <div className="mb-4 flex h-3.5 gap-[3px] overflow-hidden rounded-full bg-muted" role="img" aria-label={`${ex.awaitingReview} awaiting review, ${ex.approved} approved, ${ex.published} published, ${ex.returned} returned`}>
            <i className="block h-full bg-warning" style={{ width: seg(ex.awaitingReview) }} /><i className="block h-full bg-primary" style={{ width: seg(ex.approved) }} /><i className="block h-full bg-success" style={{ width: seg(ex.published) }} /><i className="block h-full bg-danger" style={{ width: seg(ex.returned) }} />
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[['Awaiting review', ex.awaitingReview, 'bg-warning'], ['Approved, to publish', ex.approved, 'bg-primary'], ['Published', ex.published, 'bg-success'], ['Returned to teachers', ex.returned, 'bg-danger']].map(([l, v, c]) => (
              <li key={l as string} className="flex items-center gap-2.5"><i className={cn('size-2.5 rounded-[3px]', c as string)} aria-hidden />{l}<b className="ml-auto font-semibold tabular-nums">{v as number}</b></li>
            ))}
          </ul>
        </LinkCard>
        <LinkCard className="xl:col-span-6" title="Recent activity" to="/admin/audit" linkLabel="Audit log">
          {x.recent.length ? (
            <ol className="grid">
              {x.recent.slice(0, 6).map((r, i, all) => (
                <li key={r.id} className="relative flex gap-3.5 py-2.5">
                  {i < all.length - 1 && <span aria-hidden className="absolute bottom-[-10px] left-[15px] top-10 w-px bg-border" />}
                  <span aria-hidden className="grid size-[31px] flex-none place-items-center rounded-full bg-muted text-[11.5px] font-semibold text-muted-foreground">{initials(r.actor)}</span>
                  <div className="min-w-0 text-sm"><p className="leading-snug">{r.summary}{r.actingAsSuperAdmin && <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-ink">platform admin</span>}</p><p className="mt-0.5 text-[12.5px] text-muted-foreground">{r.actor} · {fmtDateTime(r.at)}</p></div>
                </li>
              ))}
            </ol>
          ) : <p className="py-6 text-center text-sm text-muted-foreground">No activity yet</p>}
        </LinkCard>
      </div>
    </div>
  );
}
