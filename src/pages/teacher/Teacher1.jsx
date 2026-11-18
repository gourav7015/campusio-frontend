import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { post, put, patch } from '../../api/client.js';
import { Avatar } from '../../components/FileImage.jsx';
import FormModal from '../../components/FormModal.jsx';
import { Modal, Async, Badge, Button, Card, DataTable, Empty, Field, PageHeader, Select, Stat, Tabs, Input, useAction, fmtDate, fmtDateTime, fmtPct, dayName, statusTone, label } from '../../components/ui.jsx';
import { BarsChart } from '../../components/Charts.jsx';
import { DayList, WeekGrid } from '../../components/Timetable.jsx';
import RegisterEditor from '../../components/Register.jsx';
import { useDialogs } from '../../design/ui';

const T = '/api/teacher';
const todayStr = () => new Date().toLocaleDateString('en-CA');

export function TeacherTimetable() {
  const [date, setDate] = useState(todayStr());
  const [view, setView] = useState('day');
  const tt = useApi(`${T}/timetable`, { date });
  return (
    <div className="stack">
      <PageHeader title="My timetable" subtitle="Your own periods, with substitutions shown" actions={<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />} />
      <Tabs tabs={[['day', 'Day'], ['week', 'Week']]} value={view} onChange={setView} />
      <Async state={tt}>{(d) => <Card>{view === 'day' ? <DayList rows={d.day} showSection empty={`No classes on ${dayName(new Date(`${date}T00:00:00`).getDay() || 7)}`} /> : <WeekGrid week={d.week} />}</Card>}</Async>
    </div>
  );
}

export function Classes() {
  const list = useApi(`${T}/classes`);
  const nav = useNavigate();
  return (
    <div className="stack">
      <PageHeader title="My classes" subtitle="Only the classes and sections assigned to you" />
      <Card flush><Async state={list} empty={<Empty title="No classes assigned yet" >The school admin assigns classes to you.</Empty>}>{(rows) => <DataTable rows={rows} rowKey="sectionId" onRowClick={(c) => nav(`/teacher/classes/${c.sectionId}`)} columns={[
        { label: 'Class', render: (c) => <b>{c.className}</b> }, { label: 'Section', key: 'section' }, { label: 'Subjects', render: (c) => c.subjects.map((s) => s.name).join(', ') || '—' }, { label: 'Students', key: 'students' }, { label: 'Role', render: (c) => <Badge tone={c.isClassTeacher ? 'primary' : ''}>{c.role}</Badge> }]} />}</Async></Card>
    </div>
  );
}

export function ClassWorkspace() {
  const { sectionId } = useParams();
  const [tab, setTab] = useState('overview');
  const ov = useApi(`${T}/classes/${sectionId}`);
  const students = useApi(tab === 'students' || tab === 'performance' ? `${T}/classes/${sectionId}/students` : null);
  const hist = useApi(tab === 'attendance' ? `${T}/attendance/history` : null, { sectionId });
  const tt = useApi(tab === 'timetable' ? `${T}/timetable` : null);
  const hw = useApi(tab === 'homework' ? `${T}/homework` : null, { sectionId });
  const mat = useApi(tab === 'materials' ? `${T}/materials` : null, { sectionId });
  const exams = useApi(tab === 'exams' || tab === 'marks' ? `${T}/exams` : null);
  const act = useApi(tab === 'activity' ? `${T}/dashboard` : null);
  const nav = useNavigate();
  const tabs = [['overview', 'Overview'], ['students', 'Students'], ['attendance', 'Attendance'], ['timetable', 'Timetable'], ['homework', 'Homework'], ['materials', 'Study materials'], ['exams', 'Examinations'], ['marks', 'Marks'], ['performance', 'Performance'], ['activity', 'Activity history']];
  return (
    <Async state={ov}>{(o) => (
      <div className="stack">
        <PageHeader title={`${o.className} ${o.section}`} subtitle={`${o.subjects.map((s) => s.name).join(', ')} · Room ${o.room || '—'} · ${o.yearName}`} actions={o.isClassTeacher && <Link className="btn primary" to={`/teacher/attendance?sectionId=${sectionId}`}>Take attendance</Link>} />
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
        {tab === 'overview' && <div className="grid g4"><Stat value={o.studentCount} label="Students" sub={`Capacity ${o.capacity}`} /><Stat value={label(o.attendanceToday)} label="Today's register" tone={o.attendanceToday === 'submitted' ? 'green' : 'amber'} /><Stat value={o.activeHomework} label="Active homework" /><Stat value={o.upcomingExam ? fmtDate(o.upcomingExam.date) : '—'} label="Upcoming exam" sub={o.upcomingExam ? `${o.upcomingExam.exam} · ${o.upcomingExam.subject}` : 'None scheduled'} />
          <Card title="Class teacher">{o.classTeacher || <span className="muted">Not assigned</span>}</Card><Card title="Next scheduled period">{o.nextPeriod ? <><b>{o.nextPeriod.subject}</b><div className="small muted">{fmtDate(o.nextPeriod.date)} · {o.nextPeriod.startTime}</div></> : <span className="muted">None this week</span>}</Card></div>}
        {tab === 'students' && <Card flush title="Students" action={o.isClassTeacher && <Monitors sectionId={sectionId} rows={students.data || []} onSaved={students.reload} />}><Async state={students}>{(rows) => <DataTable rows={rows} rowKey="studentId" onRowClick={(s) => nav(`/teacher/students/${s.studentId}`)} columns={[{ label: 'Roll', render: (s) => String(s.rollNo).padStart(2, '0') }, { label: 'Student', render: (s) => <><b>{s.name}</b> {s.monitor && <Badge tone="blue">Monitor</Badge>}</> }, { label: 'Attendance', render: (s) => fmtPct(s.attendance) }, { label: 'Latest score', render: (s) => (s.latestScore != null ? s.latestScore : '—') }, { label: '', render: () => <span className="muted">View →</span> }]} />}</Async></Card>}
        {tab === 'attendance' && <Card flush><Async state={hist} empty={<Empty title="No registers yet" />}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Date', render: (r) => fmtDate(r.date, true) }, { label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> }, { label: 'Present', render: (r) => r.totals.present + r.totals.late }, { label: 'Absent', render: (r) => r.totals.absent }, { label: 'Leave', render: (r) => r.totals.leave + r.totals.excused }, { label: '', render: (r) => o.isClassTeacher ? <Link to={`/teacher/attendance?sectionId=${sectionId}&date=${r.date}`}>Open</Link> : null }]} />}</Async></Card>}
        {tab === 'timetable' && <Card><Async state={tt}>{(d) => <WeekGrid week={d.week.map((w) => ({ ...w, rows: w.rows.filter((r) => String(r.sectionId) === sectionId || r.isBreak) }))} />}</Async></Card>}
        {tab === 'homework' && <Card flush action={<Link className="btn sm" to="/teacher/homework?new=1">+ New</Link>} title="Homework for this class"><Async state={hw} empty={<Empty title="No homework" />}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Title', render: (h) => <b>{h.title}</b> }, { label: 'Subject', key: 'subject' }, { label: 'Due', render: (h) => fmtDate(h.dueDate) }, { label: 'Status', render: (h) => <Badge tone={statusTone(h.effectiveStatus)}>{h.effectiveStatus}</Badge> }]} />}</Async></Card>}
        {tab === 'materials' && <Card flush title="Study materials"><Async state={mat} empty={<Empty title="No materials" />}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Title', render: (m) => <b>{m.title}</b> }, { label: 'Subject', key: 'subject' }, { label: 'Chapter', key: 'chapter' }, { label: 'Status', render: (m) => <Badge tone={statusTone(m.status)}>{m.status}</Badge> }]} />}</Async></Card>}
        {(tab === 'exams' || tab === 'marks') && <Card flush><Async state={exams} empty={<Empty title="No examinations" />}>{(rows) => <DataTable rows={rows.filter((r) => r.sectionId === sectionId)} rowKey={(r) => `${r.examSubjectId}-${r.sectionId}`} empty="No exams for this class" columns={[{ label: 'Exam', key: 'exam' }, { label: 'Subject', key: 'subject' }, { label: 'Date', render: (r) => fmtDate(r.date) }, { label: 'Marks status', render: (r) => <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge> }, { label: '', render: (r) => <Link to={`/teacher/exams/${r.examSubjectId}/${r.sectionId}`}>Open marks</Link> }]} />}</Async></Card>}
        {tab === 'performance' && <Card title="Student scores" flush><Async state={students}>{(rows) => <div className="card-b"><BarsChart data={rows.map((s) => ({ name: s.name.split(' ')[0], score: s.latestScore ?? 0 }))} x="name" bars={[{ key: 'score', name: 'Latest score' }]} domain={[0, 100]} /></div>}</Async></Card>}
        {tab === 'activity' && <Card><Async state={act}>{(d) => <ul className="timeline">{d.activity.map((a) => <li key={a.id}><span className="dotc" /><div><div>{a.summary}</div><div className="small muted">{fmtDateTime(a.at)}</div></div></li>)}</ul>}</Async></Card>}
      </div>)}</Async>
  );
}

export function StudentView() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState('profile');
  const d = useApi(`${T}/students/${id}`);
  const [text, setText] = useState(''); const [kind, setKind] = useState('remark'); const [ack, setAck] = useState(true);
  const [editing, setEditing] = useState(false); const [msg, setMsg] = useState(false);
  const [run, busy] = useAction();
  return (
    <Async state={d}>{(s) => (
      <div className="stack">
        <PageHeader title={<span className="row"><Avatar fileId={s.photoFileId} name={s.profile.name} size={44} />{s.profile.name}{s.monitor && <Badge tone="blue">Class monitor</Badge>}</span>} subtitle={`${s.profile.className} ${s.profile.section} · Roll ${s.profile.rollNo} · Admission ${s.profile.admissionNo}`} actions={<Button onClick={() => setMsg(true)}>Message the family</Button>} />
        <Tabs tabs={[['profile', 'Profile summary'], ['attendance', 'Attendance'], ['marks', 'Subject marks'], ['homework', 'Homework'], ['remarks', 'Teacher remarks'], ['history', 'Academic history']]} value={tab} onChange={setTab} />
        {tab === 'profile' && <Card><dl className="kv"><dt>Gender</dt><dd>{label(s.profile.gender) || '—'}</dd><dt>House</dt><dd>{s.profile.house || '—'}</dd><dt>Guardian</dt><dd>{s.profile.guardian || '—'}</dd></dl>{s.contact && <><h3 style={{ marginTop: 14 }}>Contact details <Button size="sm" onClick={() => setEditing(true)}>Update</Button></h3><dl className="kv"><dt>Student phone</dt><dd>{s.contact.phone || '—'}</dd><dt>Student email</dt><dd>{s.contact.email || '—'}</dd><dt>Address</dt><dd>{s.contact.address || '—'}</dd><dt>Guardian phone</dt><dd>{s.contact.guardianPhone || '—'}</dd><dt>Guardian email</dt><dd>{s.contact.guardianEmail || '—'}</dd></dl>
            <p className="small muted">As class teacher you keep these up to date. Students and parents can only look at them.</p></>}
          <p className="small muted" style={{ marginTop: 10 }}>Fees, personal documents and unrelated administrative details are not shown to teachers.</p></Card>}
        {tab === 'attendance' && <div className="grid g4"><Stat value={fmtPct(s.attendance.percentage)} label="Attendance" tone="green" /><Stat value={s.attendance.present} label="Present" /><Stat value={s.attendance.absent} label="Absent" tone="red" /><Stat value={s.attendance.late + s.attendance.leave} label="Late / leave" /></div>}
        {tab === 'marks' && (s.marks.length ? s.marks.map((m) => <Card key={m.exam} title={`${m.exam} · ${label(m.examType)}${m.percentage != null ? ` · ${m.percentage}% ${m.grade || ''}` : ''}`} flush><DataTable rows={m.subjects} rowKey="subject" columns={[{ label: 'Subject', render: (x) => <b>{x.subject}</b> }, { label: 'Marks by field', render: (x) => (x.absent ? <Badge tone="red">Absent</Badge> : (x.components || []).map((c) => `${c.label} ${c.value ?? '—'}/${c.max}`).join(' · ')) }, { label: 'Total', render: (x) => `${x.obtained ?? '—'} / ${x.max}` }, { label: '%', render: (x) => fmtPct(x.percentage) }, { label: 'Grade', key: 'grade' }, { label: 'Remark', key: 'remarks' }]} /></Card>) : <Empty title="No published marks yet" />)}
        {tab === 'homework' && <Card flush><DataTable rows={s.homework} empty="No homework from you for this class" columns={[{ label: 'Title', key: 'title' }, { label: 'Due', render: (h) => fmtDate(h.dueDate) }]} /></Card>}
        {tab === 'remarks' && <div className="stack"><Card title="Add a remark or guideline for the family">
          <div className="form-grid"><Field label="Kind"><Select value={kind} onChange={(e) => setKind(e.target.value)} options={[['remark', 'Remark'], ['homework', 'Homework'], ['behaviour', 'Behaviour'], ['guideline', 'Guideline']].map(([value, l]) => ({ value, label: l }))} /></Field>
            <Field label="Message" full><Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Homework was incomplete three times this week" aria-label="Remark" /></Field></div>
          <label className="row" style={{ marginTop: 8 }}><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> Ask the family to acknowledge it. They are reminded every day until they do.</label>
          <div className="row" style={{ marginTop: 10 }}><Button variant="primary" loading={busy} disabled={text.trim().length < 3} onClick={async () => { await run(() => post(`${T}/students/${id}/remarks`, { text, category: kind, requireAck: ack }), 'Sent to the family'); setText(''); d.reload(); }}>Send</Button></div></Card>
          <Card flush><DataTable rows={s.remarks} empty="No remarks yet" rowKey="id" columns={[{ label: 'Date', render: (r) => fmtDate(r.date, true) }, { label: 'Teacher', key: 'teacher' }, { label: 'Kind', render: (r) => label(r.category || 'remark') }, { label: 'Remark', key: 'text' },
            { label: 'Family', render: (r) => (!r.requireAck ? <span className="muted small">No reply needed</span> : r.acknowledged ? <Badge tone="green">Acknowledged</Badge> : <Badge tone="amber">Not yet</Badge>) }]} /></Card></div>}
        {tab === 'history' && <Card flush><DataTable rows={s.history} rowKey="startDate" columns={[{ label: 'Year', key: 'year' }, { label: 'Class', key: 'className' }, { label: 'Section', key: 'section' }, { label: 'Roll', key: 'rollNo' }, { label: 'Status', render: (h) => <Badge tone={statusTone(h.status)}>{label(h.status)}</Badge> }]} /></Card>}
        {editing && <FormModal title="Update contact details" initial={{ phone: s.contact.phone, email: s.contact.email, address: s.contact.address, guardianPhone: s.contact.guardianPhone, guardianEmail: s.contact.guardianEmail }} fields={[{ name: 'phone', label: 'Student phone' }, { name: 'email', label: 'Student email', type: 'email' }, { name: 'address', label: 'Address', type: 'textarea' }, { name: 'guardianPhone', label: 'Guardian phone' }, { name: 'guardianEmail', label: 'Guardian email', type: 'email' }]} onClose={() => setEditing(false)}
          onSubmit={async (v) => { const { guardianPhone, guardianEmail, ...own } = v; await patch(`${T}/students/${id}`, { ...own, ...(guardianPhone || guardianEmail ? { guardian: { ...(guardianPhone ? { phone: guardianPhone } : {}), ...(guardianEmail ? { email: guardianEmail } : {}) } } : {}) }); d.reload(); return true; }} />}
        {msg && <FormModal title={`Message the family of ${s.profile.name}`} submitLabel="Send" fields={[{ name: 'text', label: 'Message', type: 'textarea', required: true }]} onClose={() => setMsg(false)} onSubmit={async (v) => { const t = await post(`${T}/chats`, { studentId: id, text: v.text }); nav(`/teacher/chats?open=${t._id}`); return true; }} />}
      </div>)}</Async>
  );
}

export function Subjects() {
  const list = useApi(`${T}/subjects`);
  return (
    <div className="stack">
      <PageHeader title="My subjects" subtitle="Each subject with the sections you teach it in" />
      <Async state={list} empty={<Empty title="No subjects assigned yet" />}>{(rows) => rows.map((s) => (
        <Card key={s.subjectId} title={`${s.name} (${s.code})`} action={<span className="muted small">{s.assignmentCount} teaching assignment(s) · {s.academicYear}</span>}>
          <div className="grid g3"><div><div className="muted small">Assigned sections</div>{s.assignments.map((a) => <Link key={a.sectionId} className="chip" style={{ margin: 2 }} to={`/teacher/classes/${a.sectionId}`}>{a.className} {a.section}</Link>)}</div>
            <div><div className="muted small">Weekly periods</div><b>{s.weeklyPeriods}</b><div className="muted small" style={{ marginTop: 8 }}>Exam structure</div>{s.examStructure ? `Theory ${s.examStructure.theory} · Practical ${s.examStructure.practical} · Internal ${s.examStructure.internal} · Pass ${s.examStructure.passMarks}` : '—'}</div>
            <div><div className="muted small">Published materials / homework</div><b>{s.materialCount}</b> / <b>{s.homeworkCount}</b><div className="muted small" style={{ marginTop: 8 }}>Marks entry</div>{Object.keys(s.marksStatus).length ? Object.entries(s.marksStatus).map(([k, v]) => <Badge key={k} tone={statusTone(k)}>{v} {label(k)}</Badge>) : <span className="muted">Not started</span>}</div></div>
        </Card>))}</Async>
    </div>
  );
}

export function Attendance() {
  const dlg = useDialogs();
  const classes = useApi(`${T}/classes`);
  const mine = (classes.data || []).filter((c) => c.isClassTeacher);
  const params = new URLSearchParams(window.location.search);
  const [sectionId, setSectionId] = useState(params.get('sectionId') || '');
  const [date, setDate] = useState(params.get('date') || todayStr());
  const sid = (mine.find((c) => c.sectionId === sectionId) || mine[0])?.sectionId || '';
  const hist = useApi(sid ? `${T}/attendance/history` : null, { sectionId: sid });
  const queries = useApi(`${T}/attendance/queries`, { status: 'open' });
  const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Attendance" subtitle="Only the class teacher takes a section's daily register. Mark, review the totals, then submit — a submitted register is locked." actions={mine.length > 0 && <>
        <Select value={sid} onChange={(e) => setSectionId(e.target.value)} options={mine.map((c) => ({ value: c.sectionId, label: `${c.className} ${c.section}` }))} aria-label="Class and section" />
        <Input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} aria-label="Date" /></>} />
      {classes.loading ? null : !mine.length ? <Empty title="You are not a class teacher">Attendance is taken by the class teacher of each section. You can still see the attendance of the classes you teach under My Classes → Attendance.</Empty> : <RegisterEditor base={T} sectionId={sid} date={date} onChange={hist.reload} />}
      {mine.length > 0 && <div className="grid g2">
        <Card title="Recent registers" flush><Async state={hist} empty={<div className="empty small">No registers yet</div>}>{(rows) => <DataTable rows={rows.slice(0, 8)} columns={[{ label: 'Date', render: (r) => <a href="#!" onClick={(e) => { e.preventDefault(); setDate(r.date); }}>{fmtDate(r.date, true)}</a> }, { label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> }, { label: 'Present', render: (r) => r.totals.present + r.totals.late }, { label: 'Absent', render: (r) => r.totals.absent }]} />}</Async></Card>
        <Card title="Attendance queries from your students" flush><Async state={queries} empty={<div className="empty small">No open queries</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Student', render: (q) => q.studentId?.name }, { label: 'Date', render: (q) => fmtDate(q.date) }, { label: 'Message', key: 'message' }, { label: '', render: (q) => <Button size="sm" onClick={async () => { const response = await dlg.prompt('Reply to the student', { title: 'Answer the query', required: true }); if (!response) return; await run(() => post(`${T}/attendance/queries/${q._id}/resolve`, { status: 'resolved', response }), 'Answered'); queries.reload(); }}>Answer</Button> }]} />}</Async></Card>
      </div>}
    </div>
  );
}

/** The class teacher chooses up to five monitors (leaders) for the section. */
export function Monitors({ sectionId, rows, onSaved, path }) {
  const [open, setOpen] = useState(false); const [sel, setSel] = useState(new Set()); const [run, busy] = useAction();
  const start = () => { setSel(new Set(rows.filter((r) => r.monitor).map((r) => r.studentId))); setOpen(true); };
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (<>
    <Button size="sm" onClick={start}>Choose monitors</Button>
    {open && <Modal title="Class monitors" onClose={() => setOpen(false)} footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={busy} disabled={sel.size > 5} onClick={async () => { const r = await run(() => put(path || `${T}/classes/${sectionId}/monitors`, { studentIds: [...sel] }), 'Monitors saved'); if (r) { setOpen(false); onSaved?.(); } }}>Save</Button></>}>
      <p className="small muted">Pick up to five students. Monitors are marked on the register and in the student's own profile. {sel.size}/5 chosen.</p>
      <div className="stack-sm" style={{ maxHeight: 340, overflowY: 'auto' }}>{rows.map((r) => <label key={r.studentId} className="row"><input type="checkbox" checked={sel.has(r.studentId)} disabled={!sel.has(r.studentId) && sel.size >= 5} onChange={() => toggle(r.studentId)} /> {String(r.rollNo).padStart(2, '0')} · {r.name}</label>)}</div>
    </Modal>}
  </>);
}
