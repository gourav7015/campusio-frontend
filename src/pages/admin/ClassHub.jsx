import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useLookups } from '../../hooks/useLookups.js';
import { post, put } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Input, PageHeader, Select, Stat, Tabs, useAction, fmtDate, label } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import ExamAnalysis from '../../components/ExamAnalysis.jsx';
import ClassBorrowers from '../../components/ClassBorrowers.jsx';
import { Classes as Structure } from './Academics.jsx';
import { Assignments } from './People.jsx';
import { RegisterModal } from './Operations.jsx';

const today = () => new Date().toLocaleDateString('en-CA');
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toLocaleDateString('en-CA');

/** Classes & sections: the one place the School Admin looks at classes — structure, subject teachers, attendance, homework, and per-class analysis. */
export function ClassHub() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'structure';
  if (tab === 'attendance') return <Navigate to="/admin/attendance" replace />; // attendance of students and staff is one page now, under Administration
  return (
    <div className="stack">
      <Tabs tabs={[['structure', 'Classes & sections'], ['subjects', 'Subjects & teachers'], ['homework', 'Homework by day']]} value={tab} onChange={(t) => setSp(t === 'structure' ? {} : { tab: t })} />
      {tab === 'structure' && <Structure />}{tab === 'subjects' && <Assignments />}{tab === 'homework' && <HomeworkByDay />}
    </div>
  );
}

// ───────────── homework of a day ─────────────
function HomeworkByDay() {
  const L = useLookups();
  const [classId, setClassId] = useState(''); const [sectionId, setSectionId] = useState('');
  const sections = L.sections.filter((s) => s.classId === classId && s.yearId === L.currentYear?._id && s.status === 'active');
  return (
    <div className="stack">
      <PageHeader title="Homework by day" subtitle="Choose a class and section to see what every subject set on a day." actions={<>
        <Select aria-label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }} placeholder="Choose a class" options={L.classOptions} />
        <Select aria-label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)} placeholder="Choose a section" options={sections.map((s) => ({ value: s._id, label: s.name }))} disabled={!classId} /></>} />
      {sectionId ? <HomeworkDay sectionId={sectionId} /> : <Empty title="Choose a class and section" />}
    </div>
  );
}

export function HomeworkDay({ sectionId }) {
  const [date, setDate] = useState(today());
  const q = useApi(`/api/school/sections/${sectionId}/homework`, { date });
  return (
    <Async state={q}>{(d) => (
      <div className="stack">
        <Card title="Last 14 days — homework given per day" action={<Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} aria-label="Date" />}>
          <div className="row wrap">{d.days.map((x) => <button key={x.date} className={`chip${x.date === date ? ' active' : ''}`} onClick={() => setDate(x.date)} aria-label={`${fmtDate(x.date)}: ${x.count} homework`}>{fmtDate(x.date)} · <b>{x.count}</b></button>)}</div>
        </Card>
        {d.subjectsWithout.length > 0 && <div className="alert info">No homework was set on {fmtDate(date, true)} for: {d.subjectsWithout.join(', ')}.</div>}
        <Card title={`Homework on ${fmtDate(date, true)}`} flush><DataTable rows={d.items} empty="No homework was given or due on this day" columns={[
          { label: 'Subject', render: (h) => <b>{h.subject}</b> }, { label: 'Homework', render: (h) => <>{h.title}{h.description && <div className="small muted">{h.description}</div>}</> }, { label: 'Teacher', key: 'teacher' }, { label: 'Type', render: (h) => label(h.type) },
          { label: 'Given', render: (h) => fmtDate(h.assignedDate) }, { label: 'Due', render: (h) => fmtDate(h.dueDate) }, { label: '', render: (h) => <Badge tone={h.kind === 'due' ? 'amber' : 'green'}>{h.kind === 'due' ? 'Due today' : h.kind === 'both' ? 'Given & due' : 'Given today'}</Badge> },
        ]} /></Card>
      </div>
    )}</Async>
  );
}

// ───────────── one section: the full picture ─────────────
export function ClassDetail() {
  const { sectionId } = useParams();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'overview';
  const ov = useApi(`/api/school/sections/${sectionId}/insight`);
  return (
    <Async state={ov}>{(o) => (
      <div className="stack">
        <PageHeader title={`${o.className} ${o.section}`} subtitle={`Class teacher: ${o.classTeacher || 'not assigned'}${o.room ? ` · Room ${o.room}` : ''} · ${o.students} of ${o.capacity} students`} actions={<Link className="btn" to="/admin/classes">← All classes</Link>} />
        <Tabs tabs={[['overview', 'Overview'], ['students', 'Students'], ['attendance', 'Attendance'], ...(o.periodWise ? [['periods', 'By period']] : []), ['homework', 'Homework'], ['subjects', 'Subjects & teachers'], ['exams', 'Exams & performance'], ['library', 'Library']]} value={tab} onChange={(t) => setSp({ tab: t })} />
        {tab === 'overview' && <Overview o={o} go={(t) => setSp({ tab: t })} />}
        {tab === 'students' && <SectionStudents sectionId={sectionId} />}
        {tab === 'periods' && o.periodWise && <SectionPeriods sectionId={sectionId} />}
        {tab === 'attendance' && <SectionAttendance sectionId={sectionId} title={`${o.className} ${o.section}`} />}
        {tab === 'homework' && <HomeworkDay sectionId={sectionId} />}
        {tab === 'subjects' && <SectionSubjects o={o} sectionId={sectionId} onChange={ov.reload} />}
        {tab === 'exams' && <ExamAnalysis sectionId={sectionId} />}
        {tab === 'library' && <ClassBorrowers base="/api/school/library" sectionId={sectionId} />}
      </div>
    )}</Async>
  );
}

function Overview({ o, go }) {
  const a = o.attendanceToday;
  return (
    <div className="stack">
      <div className="grid g4">
        <Stat value={a.status === 'submitted' ? `${a.present + a.late}/${a.total}` : label(a.status)} label="Attendance today" sub={a.status === 'submitted' ? `${a.absent} absent` : 'Register not submitted'} tone={a.status === 'submitted' ? 'green' : 'amber'} />
        <Stat value={o.attendance30 != null ? `${o.attendance30}%` : '—'} label="Attendance, last 30 days" tone="blue" />
        <Stat value={o.averageScore != null ? `${o.averageScore}%` : '—'} label="Latest exam average" tone="green" />
        <Stat value={o.activeHomework} label="Homework running" sub="not yet due" />
      </div>
      <div className="grid g4">
        <Stat value={o.students} label="Students" sub={`capacity ${o.capacity}`} /><Stat value={o.onBus} label="Ride the school bus" /><Stat value={o.booksOnLoan} label="Library books out" />
        <Stat value={o.subjectTeachers.length} label="Subjects with a teacher" sub={o.subjectTeachers.length ? undefined : 'Assign teachers in Subjects & teachers'} tone={o.subjectTeachers.length ? undefined : 'amber'} />
      </div>
      <Card title="Subject teachers" action={<Button size="sm" onClick={() => go('subjects')}>Manage</Button>} flush><DataTable rows={o.subjectTeachers} rowKey="id" empty="No teachers assigned yet" columns={[{ label: 'Subject', render: (s) => <b>{s.subject}</b> }, { label: 'Teacher', key: 'teacher' }, { label: 'Periods / week', key: 'periodsPerWeek' }]} /></Card>
    </div>
  );
}

import { Monitors } from '../teacher/Teacher1.jsx';
function SectionStudents({ sectionId }) {
  const nav = useNavigate();
  const q = useApi(`/api/school/sections/${sectionId}/students`);
  return (
    <Card title="Students — click one for the full picture (attendance, marks, homework, fees, library, bus)" flush action={<Monitors sectionId={sectionId} rows={q.data || []} path={`/api/school/monitors/${sectionId}`} onSaved={q.reload} />}>
      <Async state={q}>{(rows) => <DataTable rows={rows} rowKey="studentId" empty="No students" onRowClick={(s) => nav(`/admin/students/${s.studentId}`)} columns={[
        { label: 'Roll', key: 'rollNo' }, { label: 'Student', render: (s) => <><b>{s.name}</b> {s.monitor && <Badge tone="blue">Monitor</Badge>}<div className="small muted">{s.admissionNo}</div></> },
        { label: 'Attendance', render: (s) => s.attendance != null ? <Badge tone={s.attendance < 75 ? 'red' : s.attendance < 90 ? 'amber' : 'green'}>{s.attendance}%</Badge> : '—' },
        { label: 'Latest exam', render: (s) => s.latestScore != null ? `${s.latestScore}%` : '—' }, { label: 'Bus', render: (s) => s.bus || <span className="muted">—</span> },
        { label: 'Library', render: (s) => s.booksOut ? <Badge tone={s.overdueBooks ? 'red' : 'blue'}>{s.booksOut} out{s.overdueBooks ? ` · ${s.overdueBooks} overdue` : ''}</Badge> : <span className="muted">—</span> },
      ]} />}</Async>
    </Card>
  );
}

function SectionAttendance({ sectionId, title }) {
  const [date, setDate] = useState(today());
  const [open, setOpen] = useState(null);
  const hist = useApi('/api/school/attendance/history', { sectionId, from: daysAgo(45) });
  return (
    <div className="stack">
      <Card title="Registers — last 45 days" action={<div className="row"><Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} aria-label="Date" /><Button size="sm" onClick={() => setOpen(date)}>Open register for this date</Button></div>} flush>
        <Async state={hist}>{(rows) => <DataTable rows={rows} rowKey="id" empty="No registers yet" columns={[
          { label: 'Date', render: (r) => <b>{fmtDate(r.date, true)}</b> }, { label: 'Register', render: (r) => <Badge tone={r.status === 'submitted' ? 'green' : 'amber'}>{label(r.status)}</Badge> },
          { label: 'Present', render: (r) => r.totals.present + r.totals.late }, { label: 'Absent', render: (r) => r.totals.absent }, { label: 'Leave', render: (r) => r.totals.leave + r.totals.excused }, { label: 'Of', render: (r) => r.totals.total },
          { label: 'Attendance', render: (r) => (r.totals.total ? `${Math.round(((r.totals.present + r.totals.late) / r.totals.total) * 100)}%` : '—') }, { label: '', render: (r) => <Button size="sm" onClick={() => setOpen(r.date)}>Open</Button> },
        ]} />}</Async>
      </Card>
      <p className="muted small">Only the class teacher takes attendance. You can open a submitted register to correct a mistake — the change is recorded with your reason.</p>
      {open && <RegisterModal sectionId={sectionId} title={title} date={open} onClose={() => { setOpen(null); hist.reload(); }} />}
    </div>
  );
}

function SectionSubjects({ o, sectionId, onChange }) {
  const L = useLookups();
  const [modal, setModal] = useState(null);
  const [run] = useAction();
  const year = L.currentYear?._id;
  const asg = useApi(year ? '/api/school/teaching-assignments' : null, { sectionId, yearId: year, open: 'true' });
  const names = L.subjects.filter((x) => x.status === 'active').map((x) => x.name);
  const reload = () => { asg.reload(); onChange(); };
  return (
    <div className="stack">
      <Card title="Class teacher" action={<Button size="sm" onClick={() => setModal('ct')}>{o.classTeacher ? 'Change' : 'Assign'}</Button>}>
        {o.classTeacher ? <b>{o.classTeacher}</b> : <span className="muted">Not assigned — nobody can take this section's attendance.</span>}
        <p className="muted small" style={{ margin: '6px 0 0' }}>The class teacher is the only teacher who takes this section's attendance.</p>
      </Card>
      <Card title="Subject teachers" action={<Button size="sm" variant="primary" onClick={() => setModal('asg')}>+ Assign teacher to a subject</Button>} flush>
        <Async state={asg} empty={<div className="empty">No subject teachers yet.</div>}>{(rows) => <DataTable rows={rows} empty="No subject teachers yet" columns={[
          { label: 'Subject', render: (a) => <b>{a.subjectId?.name}</b> }, { label: 'Teacher', render: (a) => a.teacherId?.name }, { label: 'Periods / week', render: (a) => a.offeringId?.weeklyPeriods }, { label: 'Since', render: (a) => fmtDate(a.effectiveFrom, true) },
          { label: '', render: (a) => <ConfirmButton size="sm" message="End this assignment today? Future timetable periods will need a new teacher." onConfirm={async () => { await run(() => post(`/api/school/teaching-assignments/${a._id}/end`, {}), 'Assignment ended'); reload(); }}>End</ConfirmButton> },
        ]} />}</Async>
      </Card>
      {modal === 'asg' && <FormModal title="Assign teacher to a subject" fields={[{ name: 'teacherId', label: 'Teacher', type: 'select', options: L.teacherOptions, required: true },
        { name: 'subject', label: 'Subject', required: true, list: 'subject-names', hint: 'Pick an existing subject or type a new one, e.g. Mathematics' }, { name: 'weeklyPeriods', label: 'Periods per week', type: 'number', min: 1, default: 5 }, { name: 'effectiveFrom', label: 'From', type: 'date', default: today() }]}
        onClose={() => setModal(null)} onSubmit={async (v) => { await post('/api/school/teaching-assignments', { ...v, sectionId }); reload(); L.reload(); return true; }}><datalist id="subject-names">{names.map((n) => <option key={n} value={n} />)}</datalist></FormModal>}
      {modal === 'ct' && <FormModal title="Class teacher" fields={[{ name: 'teacherId', label: 'Teacher', type: 'select', options: L.teacherOptions, required: true }, { name: 'effectiveFrom', label: 'Effective from', type: 'date', default: today() }]}
        onClose={() => setModal(null)} onSubmit={async (v) => { await put(`/api/school/sections/${sectionId}/class-teacher`, v); reload(); return true; }} />}
    </div>
  );
}

/** Period-by-period attendance for one class and day, when the school takes it that way. */
function SectionPeriods({ sectionId }) {
  const [date, setDate] = useState(today());
  const q = useApi('/api/school/period-attendance', { sectionId, date });
  return (
    <Card title="Period attendance" action={<Input type="date" aria-label="Date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />} flush>
      <Async state={q}>{(d) => (!d.enabled ? <Empty title="Period-wise attendance is off">Turn it on in School settings if this school wants each teacher to mark their own period.</Empty> : <DataTable rows={d.periods} rowKey="period" empty="No period attendance was marked on this day" columns={[{ label: 'Period', key: 'period' }, { label: 'Subject', key: 'subject' }, { label: 'Teacher', key: 'teacher' }, { label: 'Absent', render: (p) => (p.absent ? <Badge tone="red">{p.absent}</Badge> : 0) }, { label: 'Late', key: 'late' }, { label: 'Students', key: 'total' }]} />)}</Async>
    </Card>
  );
}
