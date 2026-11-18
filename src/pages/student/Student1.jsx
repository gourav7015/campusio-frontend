import { useState } from 'react';
import { safeHref } from '../../design/lib/url';
import { FileText, Image, NotebookPen, Presentation, Video } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { post, patch, upload, openFile } from '../../api/client.js';
import { Avatar, PhotoUpload } from '../../components/FileImage.jsx';
import { Async, Badge, Button, Card, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Stat, Tabs, useAction, fmtDate, fmtPct, dayName, label, statusTone, cls } from '../../components/ui.jsx';
import { TrendChart, BarsChart } from '../../components/Charts.jsx';
import { DayList, WeekGrid } from '../../components/Timetable.jsx';
import Heatmap from '../../components/Heatmap.jsx';
import { BusCard } from '../../components/StudentOverview.jsx';

const S = '/api/student';


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
        <PageHeader title="My profile" actions={<><PhotoUpload path={`${S}/profile/photo`} upload={upload} label={x.personal.photoFileId ? 'Change photo' : 'Add a photo'} onDone={p.reload} />{x.editableFields.length > 0 && <Button onClick={() => { setV({ phone: x.personal.phone || '', address: x.personal.address || '', email: x.personal.email || '' }); setEdit(true); }}>Edit my details</Button>}</>} />
        <div className="row"><Avatar fileId={x.personal.photoFileId} name={x.personal.name} size={84} /><div><b>{x.personal.name}</b>{x.academic.monitor && <> <Badge tone="blue">Class monitor</Badge></>}<div className="small muted">{x.academic.className} {x.academic.section} · Roll {x.academic.rollNo}</div></div></div>
        {x.editableFields.length === 0 && <p className="small muted" style={{ margin: 0 }}>Your details are kept up to date by the school. If something is wrong, ask your class teacher or the school office to correct it.</p>}
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
      <Tabs tabs={[['overview', 'Overview'], ['history', 'Daily history'], ['calendar', 'Monthly calendar'], ['periods', 'Period by period']]} value={tab} onChange={setTab} />
      {tab === 'overview' && <Async state={sum}>{(s) => !s.workingDays ? <Empty title="No attendance recorded yet" /> : (<>
        <div className="grid g4"><Stat value={fmtPct(s.percentage)} label="Attendance" tone="green" /><Stat value={s.workingDays} label="Working days" /><Stat value={s.present} label="Present" tone="green" /><Stat value={s.absent} label="Absent" tone="red" /><Stat value={s.leave} label="Leave" tone="blue" /><Stat value={s.late} label="Late" tone="amber" /><Stat value={s.excused} label="Excused" /></div>
        <Card title="Attendance heat map — this academic year"><Async state={heat}>{(h) => <Heatmap days={h.days} />}</Async></Card>
        <div className="grid g2"><Card title="Monthly attendance %"><Async state={monthly}>{(m) => <TrendChart data={m.map((x) => ({ month: x.month, percentage: x.percentage }))} x="month" lines={[{ key: 'percentage', name: 'Attendance %' }]} />}</Async></Card>
          <Card title="Present vs absent days"><Async state={monthly}>{(m) => <BarsChart data={m.map((x) => ({ month: x.month, Present: x.present + x.late, Absent: x.absent }))} x="month" bars={[{ key: 'Present', color: 'rgb(var(--c-success))' }, { key: 'Absent', color: 'rgb(var(--c-danger))' }]} />}</Async></Card></div></>)}</Async>}
      {tab === 'history' && <div className="stack"><Card flush><Async state={hist} empty={<Empty title="No attendance yet" />}>{(rows) => <DataTable rows={rows} rowKey="date" columns={[{ label: 'Date', render: (r) => fmtDate(r.date, true) }, { label: 'Day', render: (r) => dayName(r.day) }, { label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge> }, { label: 'Remarks', render: (r) => <>{r.remarks || '—'} {r.corrected && <Badge tone="amber">corrected</Badge>}</> }, { label: '', render: (r) => <Button size="sm" onClick={() => setReport(r)}>Report an error</Button> }]} />}</Async></Card>
        <Card title="My reported errors" flush><Async state={queries} empty={<div className="empty small">None</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Date', render: (q) => fmtDate(q.date, true) }, { label: 'Message', key: 'message' }, { label: 'Status', render: (q) => <Badge tone={statusTone(q.status === 'open' ? 'pending' : q.status)}>{label(q.status)}</Badge> }, { label: 'Reply', key: 'response' }]} />}</Async></Card></div>}
      {tab === 'periods' && <PeriodByPeriod />}
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
      <Tabs tabs={[['all', 'All assignments'], ['pending', 'Pending'], ['due_soon', 'Due soon'], ['overdue', 'Overdue']]} value={tab} onChange={setTab} />
      <Card flush><Async state={list} empty={<Empty title="Nothing here" />}>{(rows) => <DataTable rows={rows} onRowClick={setOpen} columns={[{ label: 'Subject', render: (h) => <b>{h.subject}</b> }, { label: 'Homework', key: 'title' }, { label: 'Teacher', key: 'teacher' }, { label: 'Due date', render: (h) => fmtDate(h.dueDate) }, { label: 'Status', render: (h) => <Badge tone={statusTone(h.state)}>{h.state === 'overdue' ? 'Overdue' : h.state === 'due_soon' ? `Due in ${h.daysLeft}d` : 'Pending'}</Badge> }, { label: 'Files', render: (h) => (h.attachmentFiles.length ? `${h.attachmentFiles.length}` : '') }]} />}</Async></Card>
      {open && <Modal wide title={open.title} onClose={() => setOpen(null)}><dl className="kv"><dt>Subject</dt><dd>{open.subject}</dd><dt>Teacher</dt><dd>{open.teacher}</dd><dt>Assigned</dt><dd>{fmtDate(open.assignedDate, true)}</dd><dt>Due</dt><dd>{fmtDate(open.dueDate, true)} <Badge tone={statusTone(open.state)}>{label(open.state)}</Badge></dd><dt>Description</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{open.description || '—'}</dd><dt>Instructions</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{open.instructions || '—'}</dd>
        <dt>Attachments</dt><dd>{open.attachmentFiles.length ? open.attachmentFiles.map((f) => <a key={f._id} className="chip" style={{ marginRight: 6 }} href="#!" onClick={(e) => { e.preventDefault(); run(() => openFile(f._id)); }}>{f.originalName}</a>) : '—'}</dd></dl></Modal>}
    </div>
  );
}

export function StudentMaterials() {
  const [q, setQ] = useState(''); const [type, setType] = useState('');
  const list = useApi(`${S}/materials`, { q, type });
  const [run] = useAction();
  const typeIcon = { pdf: FileText, image: Image, document: FileText, presentation: Presentation, video: Video, worksheet: NotebookPen };
  return (
    <div className="stack">
      <PageHeader title="Study materials" subtitle="Organised by subject and chapter" actions={<><Input placeholder="Search title or chapter" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search materials" style={{ width: 220 }} /><Select value={type} onChange={(e) => setType(e.target.value)} options={['pdf', 'image', 'document', 'presentation', 'video', 'worksheet'].map((t) => ({ value: t, label: label(t) }))} placeholder="All types" aria-label="Type" /></>} />
      <Async state={list}>{(d) => !d.total ? <Empty title="No study materials yet" /> : d.groups.map((g) => (
        <Card key={g.subject} title={g.subject}>{g.chapters.map((c) => <div key={c.chapter} style={{ marginBottom: 14 }}><div className="bold" style={{ marginBottom: 6 }}>{c.chapter}</div><div className="stack-sm">{c.items.map((m) => (
          <div key={m._id} className="period"><div className="avatar" aria-hidden>{(() => { const Ico = typeIcon[m.materialType] || FileText; return <Ico size={16} strokeWidth={1.75} />; })()}</div><div className="grow"><b>{m.title}</b> {m.isNew && <Badge tone="primary">New</Badge>}<div className="small muted">{label(m.materialType)} · Uploaded by {m.teacher} · {fmtDate(m.createdAt, true)}{m.file ? ` · ${Math.max(1, Math.round(m.file.size / 1024))} KB` : ' · External link'}</div>{m.description && <div className="small">{m.description}</div>}</div>
            {m.file ? <Button size="sm" onClick={() => run(() => openFile(m.file._id))}>Open</Button> : <a className="btn sm" href={safeHref(m.externalUrl)} target="_blank" rel="noopener noreferrer">Open link</a>}</div>))}</div></div>)}</Card>))}</Async>
    </div>
  );
}

/** Attendance period by period, for schools that take it that way. */
function PeriodByPeriod() {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const q = useApi(`${S}/period-attendance`, { date });
  if (q.error?.status === 409) return <Card><Empty title="Your school takes attendance once a day">Period-by-period attendance is not switched on.</Empty></Card>;
  return <Card title="Period by period" action={<Input type="date" aria-label="Date" value={date} max={new Date().toLocaleDateString('en-CA')} onChange={(e) => setDate(e.target.value)} style={{ width: 170 }} />} flush>
    <Async state={q}>{(d) => <DataTable rows={d.periods} rowKey="period" empty="No period attendance was marked on this day" columns={[{ label: 'Period', render: (p) => <><b>{p.period}</b><div className="small muted">{p.time}</div></> }, { label: 'Subject', key: 'subject' }, { label: 'You were', render: (p) => <Badge tone={statusTone(p.status)}>{label(p.status) || '—'}</Badge> }]} />}</Async></Card>;
}
