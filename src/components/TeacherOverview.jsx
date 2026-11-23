import { Link } from 'react-router-dom';
import { Badge, Button, Card, DataTable, Empty, Stat, fmtDate, fmtMoney, label, statusTone, useAction } from './ui.jsx';
import { download } from '../api/client.js';
import Heatmap from './Heatmap.jsx';
import { BarsChart } from './Charts.jsx';

const tone = (p) => (p == null ? '' : p >= 75 ? 'green' : p >= 50 ? 'blue' : p >= 33 ? 'amber' : 'red');
const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Top strip of a teacher's page: everything the school knows, at a glance. */
export function TeacherSummary({ o }) {
  const students = o.classes.reduce((n, c) => n + c.students, 0);
  const avgs = o.classes.map((c) => c.latestAverage).filter((x) => x != null);
  const avg = avgs.length ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10 : null;
  return (
    <div className="grid g4">
      <Stat value={o.attendance.percentage != null ? `${o.attendance.percentage}%` : '—'} label="Attendance this year" sub={`${o.attendance.onLeave} day(s) on leave`} tone={o.attendance.percentage != null && o.attendance.percentage < 90 ? 'amber' : 'green'} />
      <Stat value={o.classes.length} label="Classes taught" sub={`${students} students · ${o.timetable.periodsPerWeek} periods a week`} tone="blue" />
      <Stat value={o.classTeacherOf.length ? o.classTeacherOf.map((c) => `${c.className} ${c.section}`).join(', ') : 'No'} label="Class teacher of" sub={o.classTeacherOf.length ? `${o.classTeacherOf.reduce((n, c) => n + c.students, 0)} students` : 'Not a class teacher'} />
      <Stat value={o.pay.current ? fmtMoney(o.pay.current.net) : '—'} label="Salary per month (net)" sub={o.pay.current ? `${o.pay.current.levelName || 'Custom'} · class average ${avg ?? '—'}%` : `No salary set · class average ${avg ?? '—'}%`} tone={o.pay.current ? 'green' : 'amber'} />
    </div>
  );
}

export function ClassesPanel({ o }) {
  return (
    <div className="stack">
      <Card title="Class teacher of" flush><DataTable rows={o.classTeacherOf} rowKey="sectionId" empty="Not a class teacher of any section" columns={[
        { label: 'Class', render: (c) => <Link to={`/admin/classes/${c.sectionId}`}><b>{c.className} {c.section}</b></Link> }, { label: 'Students', key: 'students' },
        { label: 'Attendance today', render: (c) => <Badge tone={c.attendanceToday === 'submitted' ? 'green' : 'amber'}>{label(c.attendanceToday)}</Badge> },
        { label: 'Attendance, last 30 days', render: (c) => (c.attendance30 != null ? <Badge tone={c.attendance30 < 75 ? 'red' : c.attendance30 < 90 ? 'amber' : 'green'}>{c.attendance30}%</Badge> : '—') }]} /></Card>
      <Card title="Classes and subjects taught — and how those classes did" flush><DataTable rows={o.classes} empty="No classes assigned this year" columns={[
        { label: 'Class', render: (c) => <Link to={`/admin/classes/${c.sectionId}`}><b>{c.className} {c.section}</b></Link> }, { label: 'Subject', render: (c) => <b>{c.subject}</b> }, { label: 'Periods / week', key: 'periodsPerWeek' }, { label: 'Students', key: 'students' },
        { label: 'Results (class average in this subject)', render: (c) => (c.results.length ? c.results.map((r) => <span key={r.exam} style={{ marginRight: 8 }}><Badge tone={tone(r.average)}>{r.average}%</Badge> <span className="muted small">{r.exam}</span></span>) : <span className="muted">No results yet</span>) },
        { label: 'Homework given', render: (c) => <>{c.homeworkGiven}{c.lastHomework && <div className="small muted">last {fmtDate(c.lastHomework)}</div>}</> }]} /></Card>
      <p className="muted small">Substitute periods covered this year: <b>{o.substitutions.covered}</b>. Homework set in total: <b>{o.homework.total}</b>.</p>
    </div>
  );
}

export function AttendancePanel({ o }) {
  const a = o.attendance;
  return (
    <div className="stack">
      <div className="grid g4"><Stat value={a.percentage != null ? `${a.percentage}%` : '—'} label="Attendance this year" tone="green" sub={a.derivedFromLeave ? 'implied by leave' : `${a.registers} register(s) submitted`} /><Stat value={a.present} label="Days present" sub={a.late ? `${a.late} late` : `of ${a.workingDays} working days`} /><Stat value={a.absent} label="Days absent" tone={a.absent ? 'red' : 'green'} sub={a.halfDay ? `+ ${a.halfDay} half day(s) · deducted from salary` : 'deducted from salary'} /><Stat value={a.onLeave} label="Days on leave" tone={a.onLeave > 12 ? 'amber' : ''} sub={Object.entries(a.leaveByType).map(([k, v]) => `${v} ${k}`).join(' · ') || undefined} /></div>
      <Card title="Attendance heat map — this academic year"><Heatmap days={a.days} /></Card>
      <div className="alert info">{a.derivedFromLeave ? 'The daily staff register has not been used yet, so this is implied by approved leave: a working day counts as present unless a leave covers it.' : 'From the daily staff attendance register. Days without a submitted register are left blank, not counted as absent.'}</div>
      {a.byMonth.length > 0 && <Card title="Month by month"><BarsChart data={a.byMonth} x="month" bars={[{ key: 'Present %' }]} domain={[0, 100]} unit="%" /></Card>}
      <div className="grid g2">
        <Card title="Leave balance (this year)" flush><DataTable rows={Object.entries(o.leave.balances).map(([type, b]) => ({ type, ...b }))} rowKey="type" columns={[{ label: 'Type', render: (b) => label(b.type) }, { label: 'Allowed', render: (b) => b.granted ? `${b.allowance} (${b.granted} extra)` : b.allowance }, { label: 'Used', key: 'used' }, { label: 'Remaining', render: (b) => <b>{b.remaining}</b> }]} /></Card>
        <Card title="Leave applications" flush><DataTable rows={o.leave.applications} empty="No leave applied" columns={[{ label: 'Type', render: (l) => label(l.leaveType) }, { label: 'From', render: (l) => fmtDate(l.startDate, true) }, { label: 'To', render: (l) => fmtDate(l.endDate, true) }, { label: 'Days', key: 'days' }, { label: 'Status', render: (l) => <Badge tone={statusTone(l.status)}>{label(l.status)}</Badge> }]} /></Card>
      </div>
    </div>
  );
}

export function SalaryPanel({ o }) {
  const [run] = useAction();
  const p = o.pay;
  if (!p.current) return <Empty title="No salary set yet">Set it in Payroll &amp; salaries.</Empty>;
  return (
    <div className="stack">
      <div className="grid g4"><Stat value={p.current.levelName || 'Custom'} label="Pay level" tone="blue" /><Stat value={fmtMoney(p.current.gross)} label="Gross per month" /><Stat value={fmtMoney(p.current.net)} label="Net per month" tone="green" /><Stat value={fmtMoney(p.paidThisYear)} label="Paid this academic year" /></div>
      <div className="grid g2">
        <Card title="Earnings" flush><DataTable rows={p.current.earnings} rowKey="label" columns={[{ label: 'Component', key: 'label' }, { label: 'Amount', render: (e) => fmtMoney(e.amount) }]} /></Card>
        <Card title="Deductions" flush><DataTable rows={p.current.deductions} rowKey="label" empty="No fixed deductions" columns={[{ label: 'Component', key: 'label' }, { label: 'Amount', render: (e) => fmtMoney(e.amount) }]} /></Card>
      </div>
      <Card title="Payslips" flush><DataTable rows={p.payslips} empty="No approved payroll yet" columns={[{ label: 'Month', render: (s) => <b>{monthLabel(s.month)}</b> }, { label: 'Days paid', render: (s) => `${s.paidDays} / ${s.workingDays}` }, { label: 'Gross', render: (s) => fmtMoney(s.gross) }, { label: 'Deductions', render: (s) => fmtMoney(s.totalDeductions) }, { label: 'Net', render: (s) => <b>{fmtMoney(s.net)}</b> }, { label: 'Status', render: (s) => <Badge tone={s.status === 'paid' ? 'green' : 'amber'}>{label(s.status)}</Badge> }, { label: '', render: (s) => <Button size="sm" onClick={() => run(() => download(`/api/school/payroll/payslips/${s._id}/pdf`, `payslip-${s.payslipNo}.pdf`))}>Payslip</Button> }]} /></Card>
      <Card title="Salary history" flush><DataTable rows={p.history} rowKey="effectiveFrom" columns={[{ label: 'From', render: (h) => fmtDate(h.effectiveFrom, true) }, { label: 'Level', render: (h) => h.levelName || 'Custom' }, { label: 'Gross', render: (h) => fmtMoney(h.gross) }, { label: 'Net', render: (h) => fmtMoney(h.net) }, { label: 'Reason', key: 'reason' }]} /></Card>
      <p className="muted small">Salary is changed in <Link to="/admin/payroll?tab=salaries">Payroll &amp; salaries</Link>.</p>
    </div>
  );
}

export function LibraryPanel({ o }) {
  return <Card title="Library — books borrowed" flush><DataTable rows={o.library} empty="This teacher has not borrowed any book" columns={[
    { label: 'Book', render: (l) => <><b>{l.title}</b><div className="small muted">{l.author}</div></> }, { label: 'Issued', render: (l) => fmtDate(l.issuedOn, true) }, { label: 'Due', render: (l) => fmtDate(l.dueDate, true) },
    { label: 'Returned', render: (l) => (l.returnedOn ? fmtDate(l.returnedOn, true) : '—') }, { label: 'Status', render: (l) => <Badge tone={l.overdue ? 'red' : statusTone(l.status)}>{l.overdue ? 'Overdue' : label(l.status)}</Badge> }]} /></Card>;
}
