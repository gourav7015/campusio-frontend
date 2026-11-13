import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarClock, ClipboardCheck, FilePenLine, NotebookPen, Undo2 } from 'lucide-react';
import { useGet } from '../../api/query';
import { axisProps, ChartCard, ChartTooltip, chartColor, gridProps, useChartMotion } from '../../design/charts';
import { AttentionList, Facts, LinkCard } from '../../design/patterns';
import { Badge, Button, EmptyState, ErrorState, PageHeader, PageSkeleton, StatCard } from '../../design/ui';
import { DaySchedule, type Period } from '../../components/Schedule';
import { fmtDate, fmtDateTime } from '../../components/ui.jsx';

interface Dash {
  greeting: { name: string; date: string; working: boolean; firstUpcoming?: { startTime: string; subject?: string } };
  permissions: { takeAttendance: boolean };
  today: Period[];
  cards: { assignedStudents: number; assignedClasses: number; pendingAttendance: number; activeAssignments: number };
  attendance: { totalStudents: number; present: number; late: number; absent: number; leave: number; trend: { date: string; percentage: number }[] };
  homework: { published: number; draft: number; scheduled: number; overdue: number; upcomingDeadlines: { id: string; title: string; dueDate: string }[] };
  exams: { awaitingSubmission: number; returned: number; completed: number; upcoming: { examSubjectId: string; sectionId: string; exam: string; subject: string; className?: string; section: string; date: string }[]; deadlines: { examSubjectId: string; sectionId: string; deadline: string; subject: string; section: string }[] };
  performance: { averageByExam: { exam: string; average: number }[] };
  activity: { id: string; summary: string; at: string }[];
  announcements: { _id: string; title: string; read: boolean; createdAt: string }[];
}
const short = (v: string) => { const [, m, d] = v.split('-'); return `${Number(d)}/${Number(m)}`; };

export default function TeacherDashboard() {
  const { data: x, error, refetch } = useGet<Dash>('/api/teacher/dashboard');
  const motion = useChartMotion();
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!x) return <PageSkeleton />;
  const date = new Date(x.greeting.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const periods = x.today.filter((p) => !p.isBreak && !p.free).length;
  const present = x.attendance.present + x.attendance.late;

  return (
    <div className="space-y-6">
      <PageHeader title="Today" description={`${date} · ${x.greeting.working ? `${periods} ${periods === 1 ? 'period' : 'periods'}` : 'Not a working day'}${x.greeting.firstUpcoming ? ` · Next at ${x.greeting.firstUpcoming.startTime}` : ''}`}
        actions={<>
          {x.permissions.takeAttendance && <Button variant="primary" asChild><Link to="/teacher/attendance"><ClipboardCheck />Mark attendance</Link></Button>}
          <Button asChild><Link to="/teacher/homework?new=1"><NotebookPen />New homework</Link></Button>
          <Button asChild><Link to="/teacher/exams"><FilePenLine />Marks</Link></Button>
        </>} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <LinkCard className="xl:col-span-2" title="Today's timetable" to="/teacher/timetable" linkLabel="Full week"><DaySchedule rows={x.today} showSection openClass /></LinkCard>
        <div className="space-y-6">
          <AttentionList title="To do" items={[
            { label: 'Attendance registers not submitted', count: x.cards.pendingAttendance, to: '/teacher/attendance', icon: ClipboardCheck },
            { label: 'Marks to submit', count: x.exams.awaitingSubmission, to: '/teacher/exams', icon: FilePenLine },
            { label: 'Marks returned for correction', count: x.exams.returned, to: '/teacher/exams', icon: Undo2, tone: 'danger' },
            { label: 'Homework past its due date', count: x.homework.overdue, to: '/teacher/homework', icon: NotebookPen, tone: 'neutral' },
          ]} />
          <LinkCard title="Coming up" to="/teacher/exams" linkLabel="Exams">
            {x.exams.upcoming.length || x.homework.upcomingDeadlines.length || x.exams.deadlines.length ? (
              <ul className="space-y-2.5 text-sm">
                {x.exams.upcoming.slice(0, 3).map((e) => <li key={e.examSubjectId + e.sectionId} className="flex items-center justify-between gap-3"><span className="truncate">{e.exam} · {e.subject} {e.className?.replace('Class ', '')}-{e.section}</span><Badge>{fmtDate(e.date)}</Badge></li>)}
                {x.exams.deadlines.slice(0, 2).map((e) => <li key={e.examSubjectId + e.sectionId + 'd'} className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2"><CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden /><span className="truncate">Marks due · {e.subject} {e.section}</span></span><Badge tone="warning">{fmtDate(e.deadline)}</Badge></li>)}
                {x.homework.upcomingDeadlines.slice(0, 3).map((h) => <li key={h.id} className="flex items-center justify-between gap-3"><span className="truncate">{h.title}</span><Badge>{fmtDate(h.dueDate)}</Badge></li>)}
              </ul>
            ) : <p className="py-2 text-sm text-muted-foreground">Nothing due soon.</p>}
          </LinkCard>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={x.cards.assignedStudents} hint="Across your sections" to="/teacher/classes" />
        <StatCard label="Classes" value={x.cards.assignedClasses} hint="This academic year" to="/teacher/classes" />
        <StatCard label="Present today" value={x.attendance.totalStudents ? `${present} / ${x.attendance.totalStudents}` : '—'} hint={x.attendance.absent ? `${x.attendance.absent} absent` : 'Where registers are in'} to="/teacher/attendance" />
        <StatCard label="Active assignments" value={x.cards.activeAssignments} hint="Published, not yet due" to="/teacher/homework" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Attendance, this week" description="Share of your students present or late" to="/teacher/attendance" height={220}>
          {x.attendance.trend?.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={x.attendance.trend} margin={{ left: -12, right: 8, top: 4 }}>
            <CartesianGrid {...gridProps} /><XAxis dataKey="date" tickFormatter={short} {...axisProps} /><YAxis domain={[0, 100]} unit="%" {...axisProps} />
            <Tooltip content={<ChartTooltip format={(v) => `${v}%`} />} labelFormatter={short} cursor={{ stroke: chartColor.neutral }} />
            <Area type="monotone" dataKey="percentage" name="Attendance" stroke={chartColor.primary} strokeWidth={2} fill={chartColor.primary} fillOpacity={0.08} {...motion} />
          </AreaChart></ResponsiveContainer> : <p className="grid h-full place-items-center text-sm text-muted-foreground">No attendance recorded yet</p>}
        </ChartCard>
        <ChartCard title="Average marks by exam" description="Your sections" to="/teacher/performance" height={220}>
          {x.performance.averageByExam?.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={x.performance.averageByExam} margin={{ left: -12 }}>
            <CartesianGrid {...gridProps} /><XAxis dataKey="exam" {...axisProps} /><YAxis domain={[0, 100]} unit="%" {...axisProps} />
            <Tooltip content={<ChartTooltip format={(v) => `${v}%`} />} cursor={{ fill: 'rgb(var(--c-muted))' }} />
            <Bar dataKey="average" name="Average" fill={chartColor.primary} radius={[6, 6, 0, 0]} maxBarSize={44} {...motion} />
          </BarChart></ResponsiveContainer> : <p className="grid h-full place-items-center text-sm text-muted-foreground">No marks published yet</p>}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LinkCard title="Homework" to="/teacher/homework" linkLabel="Manage"><Facts rows={[{ label: 'Published', value: x.homework.published }, { label: 'Scheduled', value: x.homework.scheduled }, { label: 'Drafts', value: x.homework.draft }, { label: 'Past due', value: x.homework.overdue }]} /></LinkCard>
        <LinkCard title="School announcements" to="/teacher/communication" linkLabel="All">
          {x.announcements.length ? <ul className="space-y-3">{x.announcements.map((a) => <li key={a._id} className="flex items-start justify-between gap-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{fmtDateTime(a.createdAt)}</p></div>{!a.read && <Badge tone="primary">New</Badge>}</li>)}</ul> : <EmptyState title="No announcements" className="py-6" />}
        </LinkCard>
      </div>

      <LinkCard title="Recent activity">
        {x.activity.length ? <ul className="divide-y divide-border/70 text-sm">{x.activity.map((a) => <li key={a.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"><span className="min-w-0 truncate">{a.summary}</span><span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(a.at)}</span></li>)}</ul> : <EmptyState title="Nothing yet" className="py-6" />}
      </LinkCard>
    </div>
  );
}
