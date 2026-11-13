import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { Async, Badge, Card, DataTable, PageHeader, Stat, fmtDateTime, fmtMoney, Empty } from '../../components/ui.jsx';
import { TrendChart, DonutChart } from '../../components/Charts.jsx';

export default function AdminDashboard() {
  const d = useApi('/api/school/dashboard');
  return (
    <Async state={d}>{(x) => (
      <div className="stack">
        <PageHeader title="School overview" subtitle={`Academic year ${x.year?.name || '— (create one in Academic years)'} · ${x.today}`} />
        <div className="grid g4">
          <Stat value={x.cards.students} label="Active students" tone="blue" sub={x.subscription ? `Limit ${x.subscription.studentLimit}` : undefined} /><Stat value={x.cards.teachers} label="Active teachers" tone="green" sub={x.subscription ? `Limit ${x.subscription.teacherLimit}` : undefined} />
          <Stat value={x.cards.sections} label="Sections this year" /><Stat value={x.attendance.pending} label="Registers pending today" tone={x.attendance.pending ? 'amber' : 'green'} sub={`${x.attendance.submitted}/${x.attendance.sections} submitted`} />
        </div>
        <div className="grid g4">
          <Link to="/admin/leave"><Stat value={x.cards.pendingLeave} label="Leave to review" tone={x.cards.pendingLeave ? 'amber' : undefined} /></Link>
          <Link to="/admin/messages"><Stat value={x.cards.unreadMessages} label="Unread messages" /></Link>
          <Link to="/admin/timetable"><Stat value={x.cards.unresolvedPeriods} label="Unresolved periods" tone={x.cards.unresolvedPeriods ? 'red' : undefined} /></Link>
          <Link to="/admin/exams"><Stat value={x.exams.awaitingReview} label="Mark sheets to review" tone={x.exams.awaitingReview ? 'amber' : undefined} /></Link>
        </div>
        <div className="grid g4">
          <Link to="/admin/fees"><Stat value={fmtMoney(x.finance.collectedMonth)} label="Fees collected this month" tone="green" /></Link><Link to="/admin/fees?tab=students"><Stat value={fmtMoney(x.finance.pending)} label="Fees pending" sub={`${fmtMoney(x.finance.overdue)} overdue`} tone={x.finance.overdue ? 'red' : 'amber'} /></Link>
          <Link to="/admin/library"><Stat value={x.library.onLoan} label="Books on loan" tone="blue" /></Link><Link to="/admin/library?tab=loans"><Stat value={x.library.overdue} label="Overdue books" tone={x.library.overdue ? 'red' : undefined} /></Link>
        </div>
        <div className="grid g-main">
          <Card title="Attendance trend (last 14 days)"><TrendChart data={x.attendanceTrend} x="date" lines={[{ key: 'percentage', name: 'Attendance %' }]} /></Card>
          <Card title="Today's attendance">
            {x.attendance.students ? <DonutChart data={[{ name: 'Present', value: x.attendance.present }, { name: 'Absent', value: x.attendance.absent }, { name: 'Late', value: x.attendance.late }, { name: 'Leave', value: x.attendance.leave + x.attendance.excused }].filter((d) => d.value)} /> : <Empty icon="🕗" title="No register submitted yet today" />}
          </Card>
        </div>
        <div className="grid g-main">
          <Card title="Recent activity" flush>
            <DataTable rows={x.recent} rowKey="id" empty="No activity yet" columns={[{ label: 'When', render: (r) => fmtDateTime(r.at) }, { label: 'By', render: (r) => <>{r.actor} {r.actingAsSuperAdmin && <Badge tone="amber">super admin</Badge>}</> }, { label: 'What', key: 'summary' }]} />
          </Card>
          <Card title="Examinations">
            <div className="stack-sm"><div className="row between"><span>Exams this year</span><b>{x.exams.total}</b></div><div className="row between"><span>Awaiting review</span><b>{x.exams.awaitingReview}</b></div>
              <div className="row between"><span>Approved, ready to publish</span><b>{x.exams.approved}</b></div><div className="row between"><span>Published sheets</span><b>{x.exams.published}</b></div><div className="row between"><span>Returned to teachers</span><b>{x.exams.returned}</b></div></div>
          </Card>
        </div>
      </div>)}</Async>
  );
}
