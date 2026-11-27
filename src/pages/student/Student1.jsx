import { useState } from 'react';
import { safeHref } from '../../design/lib/url';
import { FileText, Image, NotebookPen, Presentation, Video } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { post, upload, openFile } from '../../api/client.js';
import { Avatar, PhotoUpload } from '../../components/FileImage.jsx';
import { Async, Badge, Button, Card, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Stat, Tabs, useAction, fmtDate, fmtPct, dayName, label, statusTone, cls } from '../../components/ui.jsx';
import { TrendChart, BarsChart } from '../../components/Charts.jsx';
import { DayList, WeekGrid } from '../../components/Timetable.jsx';
import Heatmap from '../../components/Heatmap.jsx';
import { BusCard } from '../../components/StudentOverview.jsx';
import { ModeNotice } from '../../components/PeriodAttendance.jsx';
import { SubjectAttendance, EarlierDays } from '../../components/SubjectAttendance.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';

const S = '/api/student';


export function MonthCalendar({ cal, onPick }) {
  if (!cal) return null;
  const first = cal.days[0]; const offset = (first.day + 6) % 7; // Monday-first
  const today = new Date().toLocaleDateString('en-CA');
  const status = (d) => d.status || (!d.working ? 'off' : '');
  return (
    <div>
      <div className="cal">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <div key={i} className="h">{x}</div>)}
        {Array.from({ length: offset }).map((_, i) => <div key={`b${i}`} className="d blank" />)}
        {cal.days.map((d) => {
          const c = cls('d', status(d), d.date === today && 'today'); const t = `${fmtDate(d.date)}${d.status ? ` · ${label(d.status)}` : d.holiday ? ` · ${d.holiday}` : ''}`;
          // when periods are shown, a working day up to today can be opened to see each period
          return onPick && d.working && d.date <= today
            ? <button type="button" key={d.date} className={c} title={t} aria-label={`${t}. Show its periods`} onClick={() => onPick(d.date)}>{Number(d.date.slice(8))}</button>
            : <div key={d.date} className={c} title={t}>{Number(d.date.slice(8))}</div>;
        })}</div>
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
  return (
    <Async skeleton="profile" state={p}>{(x) => (
      <div className="stack">
        <PageHeader title="My profile" actions={<><PhotoUpload path={`${S}/profile/photo`} upload={upload} label={x.personal.photoFileId ? 'Change photo' : 'Add a photo'} onDone={p.reload} /></>} />
        <div className="row"><Avatar fileId={x.personal.photoFileId} name={x.personal.name} size={84} /><div><b>{x.personal.name}</b>{x.academic.monitor && <> <Badge tone="blue">Class monitor</Badge></>}<div className="small muted">{x.academic.className} {x.academic.section} · Roll {x.academic.rollNo}</div></div></div>
        <p className="small muted" style={{ margin: 0 }}>Your class teacher keeps your details up to date. If something is wrong, tell your class teacher and they will correct it.</p>
        <div className="grid g2">
          <Card title="Personal information"><dl className="kv"><dt>Name</dt><dd>{x.personal.name}</dd><dt>Date of birth</dt><dd>{fmtDate(x.personal.dob, true)}</dd><dt>Gender</dt><dd>{label(x.personal.gender) || '—'}</dd><dt>Phone</dt><dd>{x.personal.phone || '—'}</dd><dt>Email</dt><dd>{x.personal.email || '—'}</dd><dt>Address</dt><dd>{x.personal.address || '—'}</dd></dl></Card>
          <Card title="Academic information"><dl className="kv"><dt>Admission number</dt><dd>{x.academic.admissionNo}</dd><dt>Academic year</dt><dd>{x.academic.academicYear}</dd><dt>Class</dt><dd>{x.academic.className}</dd><dt>Section</dt><dd>{x.academic.section}</dd><dt>Roll number</dt><dd>{x.academic.rollNo}</dd><dt>Admission date</dt><dd>{fmtDate(x.academic.admissionDate, true)}</dd><dt>School</dt><dd>{x.academic.schoolName}</dd></dl></Card>
          <Card title="Guardians">{x.guardians.map((g, i) => <div key={i} style={{ marginBottom: 8 }}><b>{g.name}</b> <span className="muted">({g.relationship})</span><div className="small">{g.phone} {g.email && `· ${g.email}`}</div></div>)}</Card>
          <Card title="Other"><dl className="kv"><dt>House</dt><dd>{x.other.house || '—'}</dd><dt>Blood group</dt><dd>{x.other.bloodGroup || '—'}</dd><dt>Emergency contact</dt><dd>{x.other.emergencyContact?.name ? `${x.other.emergencyContact.name} · ${x.other.emergencyContact.phone}` : '—'}</dd></dl><p className="small muted" style={{ marginTop: 10 }}>Class, section, roll number and admission number can only be changed by the school office.</p></Card>
        </div>
        <MyBus />
      </div>)}</Async>
  );
}

export function StudentTimetable() {
  const [view, setView] = useState('day'); const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const t = useApi(`${S}/timetable`, { view, date }, { staleTime: 5 * 60_000 }); // a timetable rarely changes: shown from memory when you come back
  return (
    <div className="stack">
      <PageHeader title="My timetable" subtitle="Includes free periods, breaks and any substitute teachers" actions={view !== 'subject' && <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />} />
      <Tabs tabs={[['day', 'Daily'], ['week', 'Weekly'], ['subject', 'Subject-wise']]} value={view} onChange={setView} />
      <Async skeleton="table" state={t.stale ? { ...t, data: null } : t}>{(d) => <Card>{view === 'day' && <DayList rows={d.rows} showTeacher empty={d.working === false ? 'No school today' : 'No scheduled classes'} />}{view === 'week' && <WeekGrid week={d.week} showTeacher />}
        {view === 'subject' && (d.subjects?.length ? d.subjects.map((s) => <div key={s.subject} style={{ marginBottom: 14 }}><h3>{s.subject}</h3><div className="row wrap" style={{ marginTop: 6 }}>{s.slots.map((x, i) => <span key={i} className="chip">{dayName(x.day).slice(0, 3)} · {x.period} · {x.startTime} · {x.teacher}{x.room ? ` · ${x.room}` : ''}</span>)}</div></div>) : <Empty title="No timetable yet" />)}</Card>}</Async>
    </div>
  );
}

export function StudentAttendance() {
  const { user } = useAuth();
  // a school that takes attendance period by period shows subjects, not days; the days of an earlier once-a-day register stay on their own tab
  if (user?.periodWise) return <PeriodWiseAttendance />;
  return <DayWiseAttendance />;
}

/** The student's day-by-day history with the "report an error" button and the list of reported errors. `source: 'register'` = only the days one register was taken. */
function DailyHistory({ source }) {
  const hist = useApi(`${S}/attendance/history`, source ? { source } : undefined);
  const queries = useApi(`${S}/attendance/queries`);
  const [report, setReport] = useState(null); const [msg, setMsg] = useState('');
  const [run, busy] = useAction();
  return (
    <div className="stack">
      <Card flush><Async skeleton="datatable" state={hist} empty={<Empty title="No attendance yet" />}>{(rows) => <DataTable rows={rows} rowKey="date" columns={[{ label: 'Date', render: (r) => fmtDate(r.date, true) }, { label: 'Day', render: (r) => dayName(r.day) }, { label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge> }, { label: 'Remarks', render: (r) => <>{r.remarks || '—'} {r.corrected && <Badge tone="amber">corrected</Badge>}</> }, { label: '', render: (r) => <Button size="sm" onClick={() => setReport(r)}>Report an error</Button> }]} />}</Async></Card>
      <Card title="My reported errors" flush><Async skeleton="datatable" state={queries} empty={<div className="empty small">None</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Date', render: (q) => fmtDate(q.date, true) }, { label: 'Message', key: 'message' }, { label: 'Status', render: (q) => <Badge tone={statusTone(q.status === 'open' ? 'pending' : q.status)}>{label(q.status)}</Badge> }, { label: 'Reply', key: 'response' }]} />}</Async></Card>
      {report && <Modal title={`Report an error · ${fmtDate(report.date, true)}`} onClose={() => setReport(null)} footer={<><Button onClick={() => setReport(null)}>Cancel</Button><Button variant="primary" loading={busy} disabled={msg.trim().length < 5} onClick={async () => { const r = await run(() => post(`${S}/attendance/queries`, { date: report.date, message: msg }), 'Sent to your class teacher'); if (r) { setReport(null); setMsg(''); queries.reload(); } }}>Send</Button></>}>
        <p className="muted small">You can't change attendance yourself. Your class teacher or the school office will review and correct it if needed.</p><Field label="What is wrong?"><Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="e.g. I was present but marked absent" /></Field></Modal>}
    </div>
  );
}

/** Attendance taken period by period: the subjects first, then the day with its periods, the calendar, and any earlier once-a-day days. */
function PeriodWiseAttendance() {
  const [tab, setTab] = useState('overview');
  const [month, setMonth] = useState(new Date().toLocaleDateString('en-CA').slice(0, 7));
  const [pick, setPick] = useState(null);
  const { user } = useAuth();
  const subj = useApi(`${S}/period-attendance/subjects`);
  const earlier = useApi(`${S}/attendance/summary`, { source: 'register' });
  const earlierMonthly = useApi(earlier.data?.workingDays ? `${S}/attendance/monthly` : null, { source: 'register' });
  const cal = useApi(tab === 'calendar' ? `${S}/attendance/calendar` : null, { month });
  const hasEarlier = earlier.data?.workingDays > 0;
  return (
    <div className="stack">
      <PageHeader title="My attendance" subtitle="Counted period by period in each subject. A period that is not marked yet is never counted as absent" />
      <ModeNotice change={user?.attendanceChange} audience="student" />
      <Tabs tabs={[['overview', 'Subjects'], ['periods', 'Period by period'], ['calendar', 'Monthly calendar'], ...(hasEarlier ? [['earlier', 'Earlier days']] : [])]} value={tab} onChange={setTab} />
      {tab === 'overview' && <><TodayPeriods /><Async skeleton="stats" state={subj}>{(d) => <SubjectAttendance data={d} detailUrl={(id) => `${S}/period-attendance/subjects/${id}`} />}</Async></>}
      {tab === 'periods' && <PeriodByPeriod />}
      {tab === 'calendar' && <Card title="Calendar" action={<Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 170 }} aria-label="Month" />}><Async skeleton="calendar" state={cal}>{(c) => <div style={{ maxWidth: 420 }}><MonthCalendar cal={c} onPick={setPick} /><p className="muted small" style={{ marginBottom: 0 }}>Select a day to see its periods. The colour of a day is worked out from its periods.</p></div>}</Async></Card>}
      {tab === 'earlier' && <><EarlierDays s={earlier.data} byMonth={earlierMonthly.data} />
        <DailyHistory source="register" /></>}
      {pick && <PeriodDay date={pick} onClose={() => setPick(null)} />}
    </div>
  );
}

/** Attendance taken once a day: the whole-year picture, the daily history and the calendar. (A school that went back to one register a day still has its earlier periods to look at.) */
function DayWiseAttendance() {
  const [tab, setTab] = useState('overview');
  const [month, setMonth] = useState(new Date().toLocaleDateString('en-CA').slice(0, 7));
  const sum = useApi(`${S}/attendance/summary`);
  const monthly = useApi(`${S}/attendance/monthly`);
  const cal = useApi(tab === 'calendar' ? `${S}/attendance/calendar` : null, { month });
  const heat = useApi(tab === 'overview' ? `${S}/attendance/heatmap` : null);
  const { user } = useAuth();
  const hasPeriods = !!user?.periodWiseSince;
  const [pick, setPick] = useState(null);
  return (
    <div className="stack">
      <PageHeader title="My attendance" subtitle="Unmarked days are never counted as absent" />
      <ModeNotice change={user?.attendanceChange} audience="student" />
      <Tabs tabs={[['overview', 'Overview'], ['history', 'Daily history'], ['calendar', 'Monthly calendar'], ...(hasPeriods ? [['periods', 'Period by period']] : [])]} value={tab} onChange={setTab} />
      {tab === 'overview' && hasPeriods && <BySubject />}
      {tab === 'overview' && <Async skeleton="stats" state={sum}>{(s) => !s.workingDays ? <Empty title="No attendance recorded yet" /> : (<>
        <div className="grid g4"><Stat value={fmtPct(s.percentage)} label="Attendance" tone="green" /><Stat value={s.workingDays} label="Working days" /><Stat value={s.present} label="Present" tone="green" /><Stat value={s.absent} label="Absent" tone="red" /><Stat value={s.leave} label="Leave" tone="blue" /><Stat value={s.late} label="Late" tone="amber" /><Stat value={s.excused} label="Excused" /></div>
        <Card title="Attendance heat map — this academic year"><Async skeleton="chart" state={heat}>{(h) => <Heatmap days={h.days} />}</Async></Card>
        <div className="grid g2"><Card title="Monthly attendance %"><Async skeleton="chart" state={monthly}>{(m) => <TrendChart data={m.map((x) => ({ month: x.month, percentage: x.percentage }))} x="month" lines={[{ key: 'percentage', name: 'Attendance %' }]} />}</Async></Card>
          <Card title="Present vs absent days"><Async skeleton="chart" state={monthly}>{(m) => <BarsChart data={m.map((x) => ({ month: x.month, Present: x.present + x.late, Absent: x.absent }))} x="month" bars={[{ key: 'Present', color: 'rgb(var(--c-success))' }, { key: 'Absent', color: 'rgb(var(--c-danger))' }]} />}</Async></Card></div></>)}</Async>}
      {tab === 'history' && <DailyHistory />}
      {tab === 'periods' && <PeriodByPeriod />}
      {tab === 'calendar' && <Card title="Calendar" action={<Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 170 }} aria-label="Month" />}><Async skeleton="calendar" state={cal}>{(c) => <div style={{ maxWidth: 420 }}><MonthCalendar cal={c} onPick={hasPeriods ? setPick : undefined} />{hasPeriods && <p className="muted small" style={{ marginBottom: 0 }}>Select a day to see its periods.</p>}</div>}</Async></Card>}
      {pick && <PeriodDay date={pick} onClose={() => setPick(null)} />}
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
      <PageHeader title="Homework and assignments" />
      <Tabs tabs={[['all', 'All assignments'], ['pending', 'Pending'], ['due_soon', 'Due soon'], ['overdue', 'Overdue']]} value={tab} onChange={setTab} />
      <Card flush><Async skeleton="datatable" state={list} empty={<Empty title="Nothing here" />}>{(rows) => <DataTable rows={rows} onRowClick={setOpen} columns={[{ label: 'Subject', render: (h) => <b>{h.subject}</b> }, { label: 'Homework', key: 'title' }, { label: 'Teacher', key: 'teacher' }, { label: 'Due date', render: (h) => fmtDate(h.dueDate) }, { label: 'Status', render: (h) => <Badge tone={statusTone(h.state)}>{h.state === 'overdue' ? 'Overdue' : h.state === 'due_soon' ? `Due in ${h.daysLeft}d` : 'Pending'}</Badge> }, { label: 'Files', render: (h) => (h.attachmentFiles.length ? `${h.attachmentFiles.length}` : '') }]} />}</Async></Card>
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

/** One day's periods for the signed-in student, as a list (used by the day sheet and the Period by period tab). */
function PeriodList({ d }) {
  if (!d.enabled) return <Empty title="Taken once a day on this date">The class teacher took one register for the whole day then, so there are no periods to show.</Empty>;
  if (!d.periods.length) return <Empty title="No lessons on this day" />;
  return (
    <div role="list" aria-label="Periods">
      {d.periods.map((p) => (
        <div key={p.order} role="listitem" className="pg-row">
          <span className="pg-n" aria-hidden>{String(p.period).replace(/^Period\s*/i, 'P')}</span>
          <div className="pg-main"><b>{p.subject || p.period}</b><div className="small muted">{p.period} · {p.time}</div></div>
          {p.status ? <Badge tone={statusTone(p.status)}>{label(p.status)}</Badge> : <span className="muted small">Not marked yet</span>}
        </div>))}
    </div>
  );
}

const dayLabel = (d) => (d?.day ? (d.day.status === 'half_day' ? 'Half day' : label(d.day.status)) : null);

/** Opened from the calendar: that day's result and each period. */
function PeriodDay({ date, onClose }) {
  const q = useApi(`${S}/period-attendance`, { date });
  return (
    <Modal title={fmtDate(date, true)} onClose={onClose}>
      <Async skeleton="datatable" state={q}>{(d) => (<div className="stack">
        {d.day && <div>Attendance for the day: <Badge tone={statusTone(d.day.status)}>{dayLabel(d)}</Badge>{d.enabled && <span className="muted small"> · worked out from the periods</span>}</div>}
        <PeriodList d={d} />
      </div>)}</Async>
    </Modal>
  );
}

/** Today as a row of periods: where the student was in each, and how the day stands. */
function TodayPeriods() {
  const date = new Date().toLocaleDateString('en-CA');
  const q = useApi(`${S}/period-attendance`, { date });
  return (
    <Card title="Today, period by period">
      <Async skeleton="datatable" state={q}>{(d) => {
        if (!d.enabled || !d.periods.length) return <Empty title={d.enabled ? 'No lessons today' : 'Taken once a day'} />;
        const marked = d.periods.filter((p) => p.status); const here = marked.filter((p) => ['present', 'late', 'half_day'].includes(p.status)).length;
        return (
          <div className="stack">
            <b>{marked.length ? `Present in ${here} of ${marked.length} ${marked.length === 1 ? 'period' : 'periods'} so far` : 'No period has been marked yet'}</b>
            <div className="pg-chips" role="list" aria-label="Today's periods">
              {d.periods.map((p) => <div key={p.order} role="listitem" className={`pg-chip ${p.status || 'none'}`}>{String(p.period).replace(/^Period\s*/i, 'P')}<small>{p.status ? label(p.status) : 'Not yet'}</small><small>{p.subject}</small></div>)}
            </div>
            <div className="muted small">{d.day ? <>The day so far: <b>{dayLabel(d)}</b>. </> : 'The day is worked out once at least half of the periods are marked. '}A period that is not marked yet is never counted as absent.</div>
          </div>);
      }}</Async>
    </Card>
  );
}

/** Attendance by subject, from the periods taken period by period. */
function BySubject() {
  const q = useApi(`${S}/period-attendance/subjects`);
  return (
    <Async skeleton="stats" state={q}>{(d) => (d.subjects.length ? (
      <Card title="Attendance by subject" action={d.since && <span className="muted small">Since {fmtDate(d.since, true)}</span>}>
        <div className="stack">{d.subjects.map((x) => (
          <div key={x.subject} className="pg-subj"><div className="row between"><span>{x.subject} <span className="muted small">· {x.periods} {x.periods === 1 ? 'period' : 'periods'}</span></span><b>{x.percentage}%</b></div><div className="pg-bar" role="img" aria-label={`${x.subject} ${x.percentage}%`}><i style={{ width: `${x.percentage}%` }} /></div></div>))}</div>
      </Card>) : null)}</Async>
  );
}

/** Attendance period by period for any day: with buttons to step a day back or forward, and the day's count. */
function PeriodByPeriod() {
  const today = new Date().toLocaleDateString('en-CA');
  const [date, setDate] = useState(today);
  const q = useApi(`${S}/period-attendance`, { date });
  const step = (n) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); const v = d.toISOString().slice(0, 10); if (v <= today) setDate(v); };
  return <Card title="Period by period" action={<div className="row" style={{ gap: 6 }}><Button size="sm" onClick={() => step(-1)} aria-label="Previous day">Previous day</Button><Input type="date" aria-label="Date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ width: 170 }} /><Button size="sm" disabled={date >= today} onClick={() => step(1)} aria-label="Next day">Next day</Button></div>} flush>
    <Async skeleton="datatable" state={q}>{(d) => {
      const marked = d.periods.filter((p) => p.status); const here = marked.filter((p) => ['present', 'late', 'half_day'].includes(p.status)).length;
      return <>
        {d.enabled && d.periods.length > 0 && <div className="small muted" style={{ padding: '10px 16px' }}>{marked.length ? <>Present in <b>{here}</b> of <b>{marked.length}</b> {marked.length === 1 ? 'period' : 'periods'} marked{d.day ? <> · the day: <b>{dayLabel(d)}</b></> : null}</> : 'No period has been marked on this day'}</div>}
        <PeriodList d={d} />
      </>;
    }}</Async>
  </Card>;
}
