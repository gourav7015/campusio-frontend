import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookMarked, CalendarX2, ClipboardCheck, Mail, PlaneTakeoff } from 'lucide-react';
import { useGet } from '../../api/query';
import { axisProps, ChartCard, ChartTooltip, chartColor, gridProps, useChartMotion } from '../../design/charts';
import { AttentionList, Facts, LinkCard, Money, ShareList } from '../../design/patterns';
import { Badge, DataTable, ErrorState, PageHeader, PageSkeleton, Progress, StatCard } from '../../design/ui';
import { fmtDateTime, fmtMoney } from '../../components/ui.jsx';
import type { ColumnDef } from '@tanstack/react-table';

interface Recent { id: string; at: string; actor: string; actingAsSuperAdmin?: boolean; summary: string }
interface Dashboard {
  today: string; year?: { name: string };
  subscription?: { studentLimit: number; teacherLimit: number };
  cards: { students: number; teachers: number; sections: number; pendingLeave: number; unreadMessages: number; unresolvedPeriods: number };
  attendance: { students: number; present: number; absent: number; late: number; leave: number; excused: number; pending: number; submitted: number; sections: number };
  attendanceTrend: { date: string; percentage: number }[];
  exams: { total: number; awaitingReview: number; approved: number; published: number; returned: number };
  finance: { collectedMonth: number; pending: number; overdue: number };
  library: { onLoan: number; overdue: number };
  recent: Recent[];
}

const day = (v: string) => { const [, m, d] = v.split('-'); return `${Number(d)} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1]}`; };
const columns: ColumnDef<Recent>[] = [
  { id: 'at', header: 'When', accessorFn: (r) => r.at, cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{fmtDateTime(c.row.original.at)}</span> },
  { id: 'by', header: 'By', accessorFn: (r) => r.actor, cell: (c) => <span className="flex items-center gap-2">{c.row.original.actor}{c.row.original.actingAsSuperAdmin && <Badge tone="warning">platform admin</Badge>}</span> },
  { accessorKey: 'summary', header: 'What' },
];

export default function AdminDashboard() {
  const { data: x, error, refetch } = useGet<Dashboard>('/api/school/dashboard');
  const motion = useChartMotion();
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!x) return <PageSkeleton />;

  const a = x.attendance;
  const marked = a.present + a.late + a.absent + a.leave + a.excused;
  const rate = marked ? Math.round(((a.present + a.late) / marked) * 1000) / 10 : null;
  const submittedPct = a.sections ? (a.submitted / a.sections) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="School overview" description={`Academic year ${x.year?.name || 'not set yet'} · ${x.today}`} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><AttentionList items={[
          { label: 'Attendance registers not submitted today', count: a.pending, to: '/admin/classes?tab=attendance', icon: ClipboardCheck },
          { label: 'Leave applications to review', count: x.cards.pendingLeave, to: '/admin/leave', icon: PlaneTakeoff },
          { label: 'Mark sheets waiting for review', count: x.exams.awaitingReview, to: '/admin/exams', icon: ClipboardCheck },
          { label: 'Timetable periods with no teacher', count: x.cards.unresolvedPeriods, to: '/admin/timetable', icon: CalendarX2, tone: 'danger' },
          { label: 'Unread messages', count: x.cards.unreadMessages, to: '/admin/messages', icon: Mail, tone: 'neutral' },
          { label: 'Overdue library books', count: x.library.overdue, to: '/admin/library?tab=loans', icon: BookMarked, tone: 'neutral' },
        ]} /></div>
        <LinkCard title="Today's registers" to="/admin/classes?tab=attendance" linkLabel="Open">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{a.submitted}<span className="text-lg font-normal text-muted-foreground"> / {a.sections}</span></p>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">sections have submitted attendance</p>
          <Progress value={submittedPct} label="Registers submitted" />
        </LinkCard>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active students" value={x.cards.students.toLocaleString('en-IN')} hint={x.subscription ? `Plan limit ${x.subscription.studentLimit.toLocaleString('en-IN')}` : undefined} to="/admin/students" />
        <StatCard label="Active teachers" value={x.cards.teachers.toLocaleString('en-IN')} hint={x.subscription ? `Plan limit ${x.subscription.teacherLimit.toLocaleString('en-IN')}` : undefined} to="/admin/teachers" />
        <StatCard label="Attendance today" value={rate == null ? '—' : `${rate}%`} hint={rate == null ? 'No register submitted yet' : `${marked.toLocaleString('en-IN')} students marked`} to="/admin/classes?tab=attendance" />
        <StatCard label="Fees pending" value={<Money amount={x.finance.pending} />} hint={x.finance.overdue ? `${fmtMoney(x.finance.overdue)} overdue` : 'None overdue'} to="/admin/fees?tab=students" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Attendance, last 14 days" description="Share of marked students present or late" to="/admin/classes?tab=attendance" height={280}>
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
        <LinkCard title="Who is in today" to="/admin/classes?tab=attendance" linkLabel="Details">
          {marked ? <ShareList total={marked} items={[
            { label: 'Present', value: a.present, tone: 'success' }, { label: 'Late', value: a.late, tone: 'warning' },
            { label: 'Absent', value: a.absent, tone: 'danger' }, { label: 'On leave', value: a.leave + a.excused, tone: 'neutral' },
          ]} /> : <p className="py-6 text-center text-sm text-muted-foreground">No register has been submitted yet today.</p>}
        </LinkCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <LinkCard title="Fees" to="/admin/fees" linkLabel="Open">
          <Facts rows={[{ label: 'Collected this month', value: fmtMoney(x.finance.collectedMonth) }, { label: 'Pending', value: fmtMoney(x.finance.pending) }, { label: 'Overdue', value: fmtMoney(x.finance.overdue) }]} />
        </LinkCard>
        <LinkCard title="Examinations" to="/admin/exams" linkLabel="Open">
          <Facts rows={[{ label: 'This year', value: x.exams.total }, { label: 'Awaiting review', value: x.exams.awaitingReview }, { label: 'Approved, ready to publish', value: x.exams.approved }, { label: 'Published', value: x.exams.published }, { label: 'Returned to teachers', value: x.exams.returned }]} />
        </LinkCard>
        <LinkCard title="Library" to="/admin/library" linkLabel="Open">
          <Facts rows={[{ label: 'Books on loan', value: x.library.onLoan }, { label: 'Overdue', value: x.library.overdue }, { label: 'Sections this year', value: x.cards.sections }]} />
        </LinkCard>
      </div>

      <section aria-labelledby="recent-h" className="space-y-3">
        <h2 id="recent-h" className="text-lg font-semibold tracking-tight">Recent activity</h2>
        <DataTable columns={columns} data={x.recent} getRowId={(r) => r.id} pageSize={8} searchPlaceholder="Search activity" emptyTitle="No activity yet" />
      </section>
    </div>
  );
}
