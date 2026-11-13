import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { post, patch, openFile } from '../../api/client.js';
import { Async, Badge, Button, Card, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Stat, Tabs, useAction, fmtDate, fmtMoney, fmtPct, greeting, dayName, label, statusTone, cls } from '../../components/ui.jsx';
import { TrendChart, BarsChart } from '../../components/Charts.jsx';
import { DayList, WeekGrid } from '../../components/Timetable.jsx';
import Heatmap from '../../components/Heatmap.jsx';
import { BusCard } from '../../components/StudentOverview.jsx';

const S = '/api/student';

function Ring({ value }) {
  return <div className="ring" style={{ '--p': value || 0 }} role="img" aria-label={`Attendance ${value ?? 'not available'}`}><b>{value == null ? '—' : `${value}%`}</b></div>;
}

export function MonthCalendar({ cal }) {
  if (!cal) return null;
  const first = cal.days[0]; const offset = (first.day + 6) % 7; // Monday-first
  const today = new Date().toLocaleDateString('en-CA');
  const status = (d) => d.status || (!d.working ? 'off' : '');
  return (
    <div>
      <div className="cal">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <div key={i} className="h">{x}</div>)}
        {Array.from({ length: offset }).map((_, i) => <div key={`b${i}`} className="d blank" />)}
        {cal.days.map((d) => <div key={d.date} className={cls('d', status(d), d.date === today && 'today')} title={`${fmtDate(d.date)}${d.status ? ` · ${label(d.status)}` : d.holiday ? ` · ${d.holiday}` : ''}`}>{Number(d.date.slice(8))}</div>)}</div>
      <div className="legend" style={{ marginTop: 10 }}><span><i style={{ background: 'var(--green)' }} />Present</span><span><i style={{ background: 'var(--red)' }} />Absent</span><span><i style={{ background: 'var(--amber)' }} />Late</span><span><i style={{ background: 'var(--blue)' }} />Leave</span><span><i style={{ background: 'var(--border)' }} />Not recorded / non-working</span></div>
    </div>
  );
}

export function StudentDashboard() {
  const d = useApi(`${S}/dashboard`);
  const nav = useNavigate();
  return (
    <Async state={d}>{(x) => (
      <div className="stack">
        <Card><div className="row wrap between"><div><h1>{greeting()}, {x.welcome.name}! 👋</h1><p className="muted" style={{ margin: '4px 0 0' }}>Your academic overview for {new Date(x.welcome.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
          <div className="row"><Badge tone="primary">{x.welcome.className} {x.welcome.section} · {x.welcome.academicYear}</Badge><Badge tone={x.welcome.enrolmentStatus === 'active' ? 'green' : 'amber'}>{label(x.welcome.enrolmentStatus)}</Badge>{x.welcome.scheduleAvailable && <Badge>Today's schedule available</Badge>}</div></div></Card>
        <div className="grid g4">
          <Stat value={x.cards.attendance != null ? `${x.cards.attendance}%` : '—'} label="Attendance" sub={x.cards.attendance == null ? 'No attendance recorded yet' : 'Current academic year'} tone="green" /><Stat value={x.cards.pendingHomework} label="Pending homework" sub={x.overdueHomework ? `${x.overdueHomework} overdue` : 'Due assignments'} tone={x.overdueHomework ? 'red' : 'amber'} />
          <Stat value={x.cards.completedExams} label="Completed exams" sub="This academic year" /><Stat value={x.cards.latestAverage != null ? `${x.cards.latestAverage}%` : '—'} label="Latest average" sub={x.cards.latestExam || 'No published result yet'} tone="blue" />
        </div>
        <div className="grid g-main">
          <Card title="Today's timetable" action={<Link to="/student/timetable">Full timetable</Link>}><DayList rows={x.timetable.rows} showTeacher /></Card>
          <Card title="Attendance" action={<Link to="/student/attendance">Details</Link>}>
            {x.attendance.summary.workingDays ? <div className="stack"><div className="row"><Ring value={x.attendance.summary.percentage} /><div className="small stack-sm"><div>Working days: <b>{x.attendance.summary.workingDays}</b></div><div>Present: <b>{x.attendance.summary.present}</b></div><div>Absent: <b>{x.attendance.summary.absent}</b></div><div>Leave: <b>{x.attendance.summary.leave + x.attendance.summary.excused}</b></div>{x.attendance.summary.late > 0 && <div>Late: <b>{x.attendance.summary.late}</b></div>}</div></div><MonthCalendar cal={x.attendance.calendar} /></div> : <Empty icon="🗓" title="No attendance recorded yet" />}</Card>
        </div>
        <div className="grid g3">
          <Card title="Homework" action={<Link to="/student/homework">All</Link>}>{x.homework.length ? <div className="stack-sm">{x.homework.map((h) => <div key={h._id} className="row between"><div><b>{h.subject}</b> — {h.title}</div><Badge tone={statusTone(h.state)}>{h.state === 'overdue' ? 'Overdue' : fmtDate(h.dueDate)}</Badge></div>)}</div> : <Empty icon="🎉" title="No homework pending" />}</Card>
          <Card title="Upcoming examination" action={<Link to="/student/exams">Schedule</Link>}>{x.upcomingExam ? <div className="stack-sm"><div className="muted small">{x.upcomingExam.exam}</div><h2>{x.upcomingExam.subject}</h2><div>{fmtDate(x.upcomingExam.date, true)}</div><Badge tone="amber">{x.upcomingExam.daysLeft === 0 ? 'Today' : `${x.upcomingExam.daysLeft} day(s) left`}</Badge><div className="muted small">{[x.upcomingExam.startTime, x.upcomingExam.room && `Room ${x.upcomingExam.room}`].filter(Boolean).join(' · ')}</div></div> : <Empty icon="🧪" title="No exams scheduled" />}</Card>
          <Card title="Latest result" action={x.latestResult && <Link to="/student/results">View result</Link>}>{x.latestResult ? <div className="stack-sm"><div className="muted small">{x.latestResult.exam}</div><div className="row"><h1>{x.latestResult.percentage}%</h1><Badge tone="primary">Grade {x.latestResult.grade}</Badge><Badge tone={x.latestResult.resultStatus === 'pass' ? 'green' : 'red'}>{x.latestResult.resultStatus}</Badge></div>
            {x.latestResult.subjects.map((s) => <div key={s.subject} className="row between small"><span>{s.subject}</span><b>{s.percentage != null ? `${s.percentage}%` : s.grade}</b></div>)}</div> : <Empty icon="📄" title="No published results yet" />}</Card>
        </div>
        <div className="grid g2">
          <Card title="Fees" action={<Link to="/student/fees">Details</Link>}>{x.fees ? <div className="row between wrap"><div><div className="muted small">Pending</div><h2>{fmtMoney(x.fees.pending)}</h2></div><div><div className="muted small">Overdue</div><h2 style={{ color: x.fees.overdue ? 'var(--red)' : undefined }}>{fmtMoney(x.fees.overdue)}</h2></div><div><div className="muted small">Next due</div><b>{x.fees.nextDue ? fmtDate(x.fees.nextDue, true) : '—'}</b></div></div> : <Empty icon="💰" title="No fees assigned yet" />}</Card>
          <Card title="Library" action={<Link to="/student/library">My books</Link>}><div className="row between"><div><div className="muted small">Books on loan</div><h2>{x.library.onLoan}</h2></div><div><div className="muted small">Overdue</div><h2 style={{ color: x.library.overdue ? 'var(--red)' : undefined }}>{x.library.overdue}</h2></div></div></Card>
        </div>
        <div className="grid g3">
          <Card title="Announcements" action={<Link to="/student/announcements">All</Link>}>{x.announcements.length ? <ul className="timeline">{x.announcements.map((a) => <li key={a._id}><span className="dotc" /><div><b>{a.title}</b> {!a.read && <Badge tone="primary">New</Badge>}<div className="small muted">{label(a.category)} · {fmtDate(a.createdAt)}</div></div></li>)}</ul> : <Empty title="No announcements" />}</Card>
          <Card title="Coming up" action={<Link to="/student/calendar">Calendar</Link>}>{x.calendar.length ? <ul className="timeline">{x.calendar.map((c) => <li key={c.source + c.id}><span className="dotc" /><div><b>{c.title}</b><div className="small muted">{fmtDate(c.date)} · {label(c.type)}</div></div></li>)}</ul> : <Empty title="Nothing scheduled" />}</Card>
          <Card title="Recent activity" action={<Link to="/student/notifications">All</Link>}>{x.activity.length ? <ul className="timeline">{x.activity.map((a) => <li key={a.id} style={{ cursor: 'pointer' }} onClick={() => nav('/student/notifications')}><span className="dotc" /><div><div className={a.read ? '' : 'bold'}>{a.title}</div><div className="small muted">{a.body}</div></div></li>)}</ul> : <Empty title="No recent activity" />}</Card>
        </div>
      </div>)}</Async>
  );
}

/** The student's own school bus, if they ride one: number, stop, timings, driver and conductor. */
function MyBus() {
  const t = useApi(`${S}/transport`);
  return <Async state={t}>{(d) => (d.bus ? <div className="stack"><h3 style={{ margin: '8px 0 0' }}>My school bus</h3><BusCard bus={d.bus} /></div> : null)}</Async>;
}

export function StudentProfile() {
  const p = useApi(`${S}/profile`);
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState({});
  const [run, busy] = useAction();
  return (
    <Async state={p}>{(x) => (
      <div className="stack">
        <PageHeader title="My profile" actions={x.editableFields.length > 0 && <Button onClick={() => { setV({ phone: x.personal.phone || '', address: x.personal.address || '', email: x.personal.email || '' }); setEdit(true); }}>Edit my details</Button>} />
        <div className="grid g2">
          <Card title="Personal information"><dl className="kv"><dt>Name</dt><dd>{x.personal.name}</dd><dt>Date of birth</dt><dd>{fmtDate(x.personal.dob, true)}</dd><dt>Gender</dt><dd>{label(x.personal.gender) || '—'}</dd><dt>Phone</dt><dd>{x.personal.phone || '—'}</dd><dt>Email</dt><dd>{x.personal.email || '—'}</dd><dt>Address</dt><dd>{x.personal.address || '—'}</dd></dl></Card>
          <Card title="Academic information"><dl className="kv"><dt>Admission number</dt><dd>{x.academic.admissionNo}</dd><dt>Academic year</dt><dd>{x.academic.academicYear}</dd><dt>Class</dt><dd>{x.academic.className}</dd><dt>Section</dt><dd>{x.academic.section}</dd><dt>Roll number</dt><dd>{x.academic.rollNo}</dd><dt>Admission date</dt><dd>{fmtDate(x.academic.admissionDate, true)}</dd><dt>School</dt><dd>{x.academic.schoolName}</dd></dl></Card>
          <Card title="Guardians">{x.guardians.map((g, i) => <div key={i} style={{ marginBottom: 8 }}><b>{g.name}</b> <span className="muted">({g.relationship})</span><div className="small">{g.phone} {g.email && `· ${g.email}`}</div></div>)}</Card>
          <Card title="Other"><dl className="kv"><dt>House</dt><dd>{x.other.house || '—'}</dd><dt>Blood group</dt><dd>{x.other.bloodGroup || '—'}</dd><dt>Emergency contact</dt><dd>{x.other.emergencyContact?.name ? `${x.other.emergencyContact.name} · ${x.other.emergencyContact.phone}` : '—'}</dd></dl><p className="small muted" style={{ marginTop: 10 }}>Class, section, roll number and admission number can only be changed by the school office.</p></Card>
        </div>
        <MyBus />
        {edit && <Modal title="Edit my details" onClose={() => setEdit(false)} footer={<><Button onClick={() => setEdit(false)}>Cancel</Button><Button variant="primary" loading={busy} onClick={async () => { const body = Object.fromEntries(x.editableFields.map((f) => [f, v[f]]).filter(([, val]) => val !== undefined && val !== '')); const r = await run(() => patch(`${S}/profile`, body), 'Profile updated'); if (r) { setEdit(false); p.reload(); } }}>Save</Button></>}>
          <div className="stack">{x.editableFields.map((f) => <Field key={f} label={label(f)}><Input value={v[f] ?? ''} onChange={(e) => setV({ ...v, [f]: e.target.value })} /></Field>)}</div></Modal>}
      </div>)}</Async>
  );
}

export function StudentTimetable() {
  const [view, setView] = useState('day'); const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const t = useApi(`${S}/timetable`, { view, date });
  return (
    <div className="stack">
      <PageHeader title="My timetable" subtitle="Includes free periods, breaks and any substitute teachers" actions={view !== 'subject' && <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />} />
      <Tabs tabs={[['day', 'Daily'], ['week', 'Weekly'], ['subject', 'Subject-wise']]} value={view} onChange={setView} />
      <Async state={t}>{(d) => <Card>{view === 'day' && <DayList rows={d.rows} showTeacher empty={d.working === false ? 'No school today' : 'No scheduled classes'} />}{view === 'week' && <WeekGrid week={d.week} showTeacher />}
        {view === 'subject' && (d.subjects?.length ? d.subjects.map((s) => <div key={s.subject} style={{ marginBottom: 14 }}><h3>{s.subject}</h3><div className="row wrap" style={{ marginTop: 6 }}>{s.slots.map((x, i) => <span key={i} className="chip">{dayName(x.day).slice(0, 3)} · {x.period} · {x.startTime} · {x.teacher}{x.room ? ` · ${x.room}` : ''}</span>)}</div></div>) : <Empty title="No timetable yet" />)}</Card>}</Async>
    </div>
  );
}

export function StudentAttendance() {
  const [tab, setTab] = useState('overview');
  const [month, setMonth] = useState(new Date().toLocaleDateString('en-CA').slice(0, 7));
  const sum = useApi(`${S}/attendance/summary`);
  const monthly = useApi(`${S}/attendance/monthly`);
  const cal = useApi(tab === 'calendar' ? `${S}/attendance/calendar` : null, { month });
  const heat = useApi(tab === 'overview' ? `${S}/attendance/heatmap` : null);
  const hist = useApi(tab === 'history' ? `${S}/attendance/history` : null);
  const queries = useApi(tab === 'history' ? `${S}/attendance/queries` : null);
  const [report, setReport] = useState(null); const [msg, setMsg] = useState('');
  const [run, busy] = useAction();
  return (
    <div className="stack">
      <PageHeader title="My attendance" subtitle="Unmarked days are never counted as absent" />
      <Tabs tabs={[['overview', 'Overview'], ['history', 'Daily history'], ['calendar', 'Monthly calendar']]} value={tab} onChange={setTab} />
      {tab === 'overview' && <Async state={sum}>{(s) => !s.workingDays ? <Empty icon="🗓" title="No attendance recorded yet" /> : (<>
        <div className="grid g4"><Stat value={fmtPct(s.percentage)} label="Attendance" tone="green" /><Stat value={s.workingDays} label="Working days" /><Stat value={s.present} label="Present" tone="green" /><Stat value={s.absent} label="Absent" tone="red" /><Stat value={s.leave} label="Leave" tone="blue" /><Stat value={s.late} label="Late" tone="amber" /><Stat value={s.excused} label="Excused" /></div>
        <Card title="Attendance heat map — this academic year"><Async state={heat}>{(h) => <Heatmap days={h.days} />}</Async></Card>
        <div className="grid g2"><Card title="Monthly attendance %"><Async state={monthly}>{(m) => <TrendChart data={m.map((x) => ({ month: x.month, percentage: x.percentage }))} x="month" lines={[{ key: 'percentage', name: 'Attendance %' }]} />}</Async></Card>
          <Card title="Present vs absent days"><Async state={monthly}>{(m) => <BarsChart data={m.map((x) => ({ month: x.month, Present: x.present + x.late, Absent: x.absent }))} x="month" bars={[{ key: 'Present', color: '#16a34a' }, { key: 'Absent', color: '#dc2626' }]} />}</Async></Card></div></>)}</Async>}
      {tab === 'history' && <div className="stack"><Card flush><Async state={hist} empty={<Empty title="No attendance yet" />}>{(rows) => <DataTable rows={rows} rowKey="date" columns={[{ label: 'Date', render: (r) => fmtDate(r.date, true) }, { label: 'Day', render: (r) => dayName(r.day) }, { label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge> }, { label: 'Remarks', render: (r) => <>{r.remarks || '—'} {r.corrected && <Badge tone="amber">corrected</Badge>}</> }, { label: '', render: (r) => <Button size="sm" onClick={() => setReport(r)}>Report an error</Button> }]} />}</Async></Card>
        <Card title="My reported errors" flush><Async state={queries} empty={<div className="empty small">None</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Date', render: (q) => fmtDate(q.date, true) }, { label: 'Message', key: 'message' }, { label: 'Status', render: (q) => <Badge tone={statusTone(q.status === 'open' ? 'pending' : q.status)}>{label(q.status)}</Badge> }, { label: 'Reply', key: 'response' }]} />}</Async></Card></div>}
      {tab === 'calendar' && <Card title="Calendar" action={<Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 170 }} aria-label="Month" />}><Async state={cal}>{(c) => <div style={{ maxWidth: 420 }}><MonthCalendar cal={c} /></div>}</Async></Card>}
      {report && <Modal title={`Report an error · ${fmtDate(report.date, true)}`} onClose={() => setReport(null)} footer={<><Button onClick={() => setReport(null)}>Cancel</Button><Button variant="primary" loading={busy} disabled={msg.trim().length < 5} onClick={async () => { const r = await run(() => post(`${S}/attendance/queries`, { date: report.date, message: msg }), 'Sent to your class teacher'); if (r) { setReport(null); setMsg(''); queries.reload(); } }}>Send</Button></>}>
        <p className="muted small">You can't change attendance yourself. Your class teacher or the school office will review and correct it if needed.</p><Field label="What is wrong?"><Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="e.g. I was present but marked absent" /></Field></Modal>}
    </div>
  );
}

export function StudentHomework() {
  const [tab, setTab] = useState('all');
  const list = useApi(`${S}/homework`, { tab });
  const [open, setOpen] = useState(null);
  const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Homework & assignments" />
      <Tabs tabs={[['all', 'All assignments'], ['pending', 'Pending'], ['due_soon', 'Due soon'], ['overdue', 'Overdue'], ['completed', 'Completed']]} value={tab} onChange={setTab} />
      <Card flush><Async state={list} empty={<Empty icon="🎉" title={tab === 'completed' ? 'Online submission is coming soon' : 'Nothing here'} />}>{(rows) => <DataTable rows={rows} onRowClick={setOpen} columns={[{ label: 'Subject', render: (h) => <b>{h.subject}</b> }, { label: 'Homework', key: 'title' }, { label: 'Teacher', key: 'teacher' }, { label: 'Due date', render: (h) => fmtDate(h.dueDate) }, { label: 'Status', render: (h) => <Badge tone={statusTone(h.state)}>{h.state === 'overdue' ? 'Overdue' : h.state === 'due_soon' ? `Due in ${h.daysLeft}d` : 'Pending'}</Badge> }, { label: 'Files', render: (h) => (h.attachmentFiles.length ? `📎 ${h.attachmentFiles.length}` : '') }]} />}</Async></Card>
      {open && <Modal wide title={open.title} onClose={() => setOpen(null)}><dl className="kv"><dt>Subject</dt><dd>{open.subject}</dd><dt>Teacher</dt><dd>{open.teacher}</dd><dt>Assigned</dt><dd>{fmtDate(open.assignedDate, true)}</dd><dt>Due</dt><dd>{fmtDate(open.dueDate, true)} <Badge tone={statusTone(open.state)}>{label(open.state)}</Badge></dd><dt>Description</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{open.description || '—'}</dd><dt>Instructions</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{open.instructions || '—'}</dd>
        <dt>Attachments</dt><dd>{open.attachmentFiles.length ? open.attachmentFiles.map((f) => <a key={f._id} className="chip" style={{ marginRight: 6 }} href="#!" onClick={(e) => { e.preventDefault(); run(() => openFile(f._id)); }}>📎 {f.originalName}</a>) : '—'}</dd></dl></Modal>}
    </div>
  );
}

export function StudentMaterials() {
  const [q, setQ] = useState(''); const [type, setType] = useState('');
  const list = useApi(`${S}/materials`, { q, type });
  const [run] = useAction();
  const typeIcon = { pdf: '📕', image: '🖼', document: '📄', presentation: '📊', video: '🎬', worksheet: '📝' };
  return (
    <div className="stack">
      <PageHeader title="Study materials" subtitle="Organised by subject and chapter" actions={<><Input placeholder="Search title or chapter" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search materials" style={{ width: 220 }} /><Select value={type} onChange={(e) => setType(e.target.value)} options={['pdf', 'image', 'document', 'presentation', 'video', 'worksheet'].map((t) => ({ value: t, label: label(t) }))} placeholder="All types" aria-label="Type" /></>} />
      <Async state={list}>{(d) => !d.total ? <Empty icon="📎" title="No study materials yet" /> : d.groups.map((g) => (
        <Card key={g.subject} title={g.subject}>{g.chapters.map((c) => <div key={c.chapter} style={{ marginBottom: 14 }}><div className="bold" style={{ marginBottom: 6 }}>{c.chapter}</div><div className="stack-sm">{c.items.map((m) => (
          <div key={m._id} className="period"><div style={{ fontSize: 22 }}>{typeIcon[m.materialType]}</div><div className="grow"><b>{m.title}</b> {m.isNew && <Badge tone="primary">New</Badge>}<div className="small muted">{label(m.materialType)} · Uploaded by {m.teacher} · {fmtDate(m.createdAt, true)}{m.file ? ` · ${Math.max(1, Math.round(m.file.size / 1024))} KB` : ' · External link'}</div>{m.description && <div className="small">{m.description}</div>}</div>
            {m.file ? <Button size="sm" onClick={() => run(() => openFile(m.file._id))}>Open</Button> : <a className="btn sm" href={m.externalUrl} target="_blank" rel="noopener noreferrer">Open link</a>}</div>))}</div></div>)}</Card>))}</Async>
    </div>
  );
}
