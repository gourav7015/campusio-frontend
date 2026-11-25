import FeeSchedule from '../../components/FeeSchedule.jsx';
import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { patch, download, openFile } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Async, Badge, Button, Card, DataTable, Empty, Modal, PageHeader, Select, Stat, Tabs, useAction, fmtDate, fmtMoney, fmtPct, label, dayName } from '../../components/ui.jsx';
import { TrendChart, BarsChart, DonutChart } from '../../components/Charts.jsx';
import PayOnline from './PayOnline.jsx';

const S = '/api/student';

export function StudentExams() {
  const sch = useApi(`${S}/exams/schedule`);
  return (
    <div className="stack">
      <PageHeader title="Examinations" subtitle="Dates are shown in your school's time zone" />
      <Card flush><Async state={sch} empty={<Empty title="No examination schedule has been published" />}>{(rows) => {
        // one list: what is coming first (soonest at the top), then what is done (latest at the top)
        const f = [...rows.filter((r) => r.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft), ...rows.filter((r) => r.daysLeft < 0).sort((a, b) => b.daysLeft - a.daysLeft)];
        return <DataTable rows={f} empty="No examinations yet" columns={[{ label: 'Examination', render: (r) => <>{r.exam} <Badge>{label(r.type)}</Badge></> }, { label: 'Subject', render: (r) => <b>{r.subject}</b> }, { label: 'Date', render: (r) => fmtDate(r.date, true) }, { label: 'Time', render: (r) => (r.startTime ? `${r.startTime}${r.endTime ? `–${r.endTime}` : ''}` : '—') }, { label: 'Room', render: (r) => r.room || '—' },
          { label: '', render: (r) => (r.daysLeft > 0 ? <Badge tone="amber">{r.daysLeft} days left</Badge> : r.daysLeft === 0 ? <Badge tone="red">Today</Badge> : <Badge>Done</Badge>) }]} />; }}</Async></Card>
    </div>
  );
}

export function StudentResults() {
  const [tab, setTab] = useState('mine');
  return (
    <div className="stack">
      <PageHeader title="Results, report cards & class ranks" subtitle="Only published results are shown" />
      <Tabs tabs={[['mine', 'My results'], ['class', 'All tests of my class']]} value={tab} onChange={setTab} />
      {tab === 'mine' ? <MyResults /> : <ClassResults />}
    </div>
  );
}

function MyResults() {
  const list = useApi(`${S}/results`);
  const nav = useNavigate();
  return (
    <Card flush><Async state={list} empty={<Empty title="No results yet" />}>{(rows) => <DataTable rows={rows} rowKey="examId" columns={[{ label: 'Examination', render: (r) => <><b>{r.name}</b> <Badge>{label(r.type)}</Badge></> }, { label: 'Date', render: (r) => fmtDate(r.date) }, { label: 'Percentage', render: (r) => (r.status === 'published' ? fmtPct(r.percentage) : '—') }, { label: 'Grade', render: (r) => r.grade || '—' },
      { label: 'Status', render: (r) => (r.status === 'published' ? <Badge tone="green">Published</Badge> : <Badge tone="amber">Upcoming</Badge>) }, { label: '', render: (r) => r.status === 'published' && <Button size="sm" variant="primary" onClick={() => nav(`/student/results/${r.examId}`)}>View report card</Button> }]} />}</Async></Card>
  );
}

/** Every test held for the student's class — attempted or not — with everyone's results and the student's rank. */
function ClassResults() {
  const list = useApi(`${S}/class-results`);
  const [open, setOpen] = useState(null);
  return (
    <div className="stack">
      <Card flush><Async state={list} empty={<Empty title="No tests have been held for your class yet" />}>{(rows) => <DataTable rows={rows} rowKey="examId" onRowClick={(r) => r.status === 'published' && setOpen(r)} columns={[
        { label: 'Test', render: (r) => <><b>{r.name}</b> <Badge>{label(r.type)}</Badge><div className="small muted">{r.subjects.join(', ')}</div></> }, { label: 'Date', render: (r) => fmtDate(r.date, true) },
        { label: 'Status', render: (r) => <Badge tone={r.status === 'published' ? 'green' : 'amber'}>{r.status === 'published' ? 'Results out' : r.status === 'upcoming' ? 'Upcoming' : 'Awaiting results'}</Badge> },
        { label: 'My result', render: (r) => (r.status !== 'published' ? '—' : !r.hasResult ? <span className="muted">No result</span> : !r.attempted ? <Badge>Not attempted</Badge> : <><b>{fmtPct(r.myPercentage)}</b> <span className="muted small">{r.myGrade}</span></>) },
        { label: 'Rank', render: (r) => (r.status === 'published' && r.hasResult ? <b>{r.myRank} <span className="muted small">of {r.classSize}</span></b> : '—') }, { label: '', render: (r) => r.status === 'published' && <Button size="sm" onClick={() => setOpen(r)}>See everyone</Button> }]} />}</Async></Card>
      {open && <LeaderboardModal exam={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function LeaderboardModal({ exam, onClose }) {
  const d = useApi(`${S}/class-results/${exam.examId}`);
  return (
    <Modal wide title={`${exam.name} — class results`} onClose={onClose}>
      <Async state={d}>{(x) => !x.published ? <Empty title="Results are not out yet" /> : (<>
        <div className="row wrap" style={{ marginBottom: 12 }}>{x.me ? <Badge tone="primary">Your rank: {x.me.rank} of {x.classSize}</Badge> : <Badge>You have no result in this test</Badge>}<Badge>Class average {x.average}%</Badge></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Rank</th><th>Roll</th><th>Student</th>{x.subjects.map((s) => <th key={s.code}>{s.subject}<div className="small muted" style={{ textTransform: 'none', fontWeight: 400 }}>/{s.max}</div></th>)}<th>Total</th><th>%</th><th>Grade</th></tr></thead>
          <tbody>{x.rows.map((r) => (
            <tr key={r.studentId} style={r.isMe ? { background: 'var(--primary-50)', fontWeight: 600 } : undefined}><td>{r.attempted ? r.rank : <span title="Not attempted">{r.rank}</span>}</td><td>{r.rollNo}</td><td>{r.name} {r.isMe && <Badge tone="primary">You</Badge>} {!r.attempted && <Badge>Not attempted</Badge>}</td>
              {x.subjects.map((s) => <td key={s.code}>{r.marks[s.code] ? (r.marks[s.code].absent ? 'AB' : r.marks[s.code].obtained ?? '—') : '—'}</td>)}<td>{r.attempted ? `${r.obtained}/${r.max}` : '—'}</td><td>{r.attempted ? fmtPct(r.percentage) : '—'}</td><td>{r.grade || '—'}</td></tr>))}</tbody></table></div></>)}</Async>
    </Modal>
  );
}

export function ResultDetail() {
  const { examId } = useParams();
  const r = useApi(`${S}/results/${examId}`);
  const [run, busy] = useAction();
  return (
    <Async state={r}>{(x) => (
      <div className="stack">
        <PageHeader title={x.exam.name} subtitle={`${x.student.name} · Admission ${x.student.admissionNo}${x.version > 1 ? ` · Revised (version ${x.version})` : ''}`} actions={<><Link className="btn" to="/student/results">← All results</Link><Button variant="primary" loading={busy} onClick={() => run(() => download(`${S}/results/${examId}/pdf`, `report-card-${x.exam.name}.pdf`))}>Download PDF report card</Button></>} />
        {x.correctionReason && <div className="alert info">This report card was revised: {x.correctionReason}</div>}
        <div className="grid g4"><Stat value={fmtPct(x.percentage)} label="Overall percentage" tone="blue" /><Stat value={x.grade} label="Grade" /><Stat value={`${x.totalObtained} / ${x.totalMax}`} label="Total marks" /><Stat value={label(x.resultStatus)} label="Result" tone={x.resultStatus === 'pass' ? 'green' : 'red'} /></div>
        <Card title="Subject-wise" flush><DataTable rows={x.subjects} rowKey="subject" columns={[{ label: 'Subject', render: (s) => <b>{s.subject}</b> }, { label: 'Marks by field', render: (s) => (s.absent ? <Badge tone="red">Absent</Badge> : s.exempt ? 'Exempt' : (s.components || []).map((c) => `${c.label} ${c.value ?? '—'}/${c.max}`).join(' · ')) }, { label: 'Obtained', render: (s) => (s.exempt ? 'EX' : s.obtained ?? '—') }, { label: 'Max', key: 'max' }, { label: '%', render: (s) => fmtPct(s.percentage) }, { label: 'Grade', render: (s) => <Badge tone={s.passed ? 'green' : 'red'}>{s.grade}</Badge> }, { label: 'Teacher remarks', key: 'remarks' }]} /></Card>
        <div className="grid g2"><Card title="Attendance summary"><div>Attendance: <b>{fmtPct(x.attendance.percentage)}</b> · {x.attendance.present} present of {x.attendance.workingDays} days</div></Card>
          <Card title="Remarks"><div><b>Class teacher:</b> {x.teacherRemark || '—'}</div><div style={{ marginTop: 6 }}><b>Principal:</b> {x.principalRemark || '—'}</div></Card></div>
      </div>)}</Async>
  );
}

/** Where the student stands in the whole class: rank, spread of marks, subjects against the class, attendance against the class. Classmates are never named. */
export function StudentClassAnalysis() {
  const a = useApi(`${S}/class-analysis`);
  const tone = { top: 'green', leading: 'green', above: 'blue', near: 'amber', below: 'red' };
  return (
    <div className="stack">
      <Async state={a}>{(d) => (
        <>
          <PageHeader title="Class analysis" subtitle={`${[d.className, d.section].filter(Boolean).join('-')}${d.classSize ? ` · ${d.classSize} students` : ''} · built from published results and submitted attendance; classmates stay anonymous`} />
          {!d.ready ? <Empty title="Your class standing will appear here">Once results of a test are published for your class, you will see where you stand.</Empty> : <ClassAnalysisBody d={d} tone={tone} />}
        </>
      )}</Async>
    </div>
  );
}

function ClassAnalysisBody({ d, tone }) {
  const o = d.overall;
  const maxBand = Math.max(1, ...d.distribution.map((b) => b.count));
  const weak = d.subjects.filter((x) => x.gap < 0).sort((x, y) => x.gap - y.gap);
  const strong = d.subjects.filter((x) => x.gap > 0);
  const watch = [
    ...weak.slice(0, 3).map((x) => `${x.subject}: ${Math.abs(x.gap)} points below the class average (${x.mine}% against ${x.classAverage}%).`),
    ...(o.movement === 'down' ? ['Your position in the class dropped in the latest test compared with the one before.'] : []),
    ...(d.attendance && d.attendance.mine < d.attendance.classAverage ? [`Attendance is ${fmtPct(d.attendance.mine)}, below the class average of ${fmtPct(d.attendance.classAverage)}.`] : []),
  ];
  const trend = d.tests.map((t) => ({ test: t.name, you: t.myPercentage, 'Class average': t.average }));
  return (
    <>
      <Card>
        <div className="row wrap" style={{ gap: 24, alignItems: 'center' }}>
          <div style={{ flex: '1 1 260px' }}>
            <Badge tone={tone[d.standing.key]}>{d.standing.label}</Badge>
            <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15, marginTop: 8 }}>Rank {o.rank} <span className="muted" style={{ fontSize: 20, fontWeight: 500 }}>of {o.of}</span></div>
            <p className="muted" style={{ marginTop: 6 }}>
              {o.ahead > 0 ? `You are ahead of ${o.ahead} classmate${o.ahead === 1 ? '' : 's'}` : 'Nobody is behind you yet'} across {o.testsCounted} published test{o.testsCounted === 1 ? '' : 's'}.
              {o.movement === 'up' && ' You moved up in the latest test.'}{o.movement === 'down' && ' You moved down in the latest test.'}{o.movement === 'steady' && ' Your position is steady.'}
            </p>
          </div>
          <div className="grid g3" style={{ flex: '2 1 420px' }}>
            <Stat value={fmtPct(o.myAverage)} label="Your average" tone="blue" />
            <Stat value={fmtPct(o.classAverage)} label="Class average" sub={`${o.gap >= 0 ? '+' : ''}${o.gap} points for you`} />
            <Stat value={d.attendance ? fmtPct(d.attendance.mine) : '—'} label="Your attendance" sub={d.attendance ? `Class ${fmtPct(d.attendance.classAverage)} · rank ${d.attendance.rank} of ${d.attendance.of}` : 'No register yet'} />
          </div>
        </div>
      </Card>

      <div className="grid g2">
        <Card title="Where the class stands" subtitle={d.distributionExam ? `${d.distributionExam} · number of students in each marks band` : undefined}>
          {d.distribution.length ? (
            <div className="stack" style={{ gap: 10 }}>
              {d.distribution.map((b) => (
                <div key={b.label} className="row" style={{ gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 110, fontSize: 13 }}>{b.label}</div>
                  <div style={{ flex: 1, background: 'var(--muted, #eee)', borderRadius: 6, height: 22, overflow: 'hidden' }}>
                    <div style={{ width: `${(b.count / maxBand) * 100}%`, minWidth: b.count ? 6 : 0, height: '100%', background: b.mine ? 'rgb(var(--c-primary))' : 'rgb(var(--c-primary) / .35)' }} />
                  </div>
                  <div style={{ width: 90, fontSize: 13 }}>{b.count} student{b.count === 1 ? '' : 's'}{b.mine && <b> · you</b>}</div>
                </div>
              ))}
            </div>
          ) : <Empty title="No spread to show yet" />}
        </Card>
        <Card title="You against the class, test by test">
          <TrendChart data={trend} x="test" lines={[{ key: 'you', name: 'You' }, { key: 'Class average', name: 'Class average', color: 'rgb(var(--c-warning))' }]} />
        </Card>
      </div>

      <Card title="Subject by subject" subtitle="Your average, the class average and the highest average in each subject">
        <BarsChart data={d.subjects} x="subject" bars={[{ key: 'mine', name: 'You', color: 'rgb(var(--c-primary))' }, { key: 'classAverage', name: 'Class average', color: 'rgb(var(--c-warning))' }, { key: 'highest', name: 'Highest', color: 'rgb(var(--c-success))' }]} domain={[0, 100]} unit="%" />
      </Card>

      <div className="grid g2">
        <Card title="What to keep an eye on">
          {watch.length ? <ul style={{ paddingLeft: 18, margin: 0, lineHeight: 1.7 }}>{watch.map((w) => <li key={w}>{w}</li>)}</ul> : <p className="muted" style={{ margin: 0 }}>Nothing is lagging behind the class right now. Keep it up.</p>}
        </Card>
        <Card title="Where you are strongest">
          {strong.length ? <ul style={{ paddingLeft: 18, margin: 0, lineHeight: 1.7 }}>{strong.slice(0, 4).map((x) => <li key={x.subject}>{x.subject}: {x.gap} points above the class average ({x.mine}%).</li>)}</ul> : <p className="muted" style={{ margin: 0 }}>No subject is above the class average yet.</p>}
        </Card>
      </div>

      <Card title="Every test" flush>
        <DataTable rows={[...d.tests].reverse()} rowKey="examId" columns={[
          { label: 'Test', render: (t) => <><b>{t.name}</b> <Badge>{label(t.type)}</Badge></> },
          { label: 'Your result', render: (t) => (t.myPercentage == null ? <span className="muted">Not attempted</span> : <b>{fmtPct(t.myPercentage)}</b>) },
          { label: 'Your rank', render: (t) => (t.myRank ? `${t.myRank} of ${t.takers}` : '—') },
          { label: 'Class average', render: (t) => fmtPct(t.average) }, { label: 'Median', render: (t) => fmtPct(t.median) }, { label: 'Highest', render: (t) => fmtPct(t.highest) }, { label: 'Lowest', render: (t) => fmtPct(t.lowest) },
        ]} />
      </Card>
    </>
  );
}

export function StudentPerformance() {
  const [examId, setExamId] = useState('');
  const p = useApi(`${S}/performance`, { examId });
  return (
    <div className="stack">
      <PageHeader title="My performance" subtitle="Built only from your published results and attendance" actions={<Async state={p}>{(d) => d.exams.length > 1 ? <Select value={examId || d.latestExam?.id || ''} onChange={(e) => setExamId(e.target.value)} options={d.exams.map((e) => ({ value: e.id, label: e.name }))} aria-label="Examination" /> : null}</Async>} />
      <Async state={p}>{(d) => (!d.trend.length && !d.attendanceTrend.length ? <Empty title="Your charts will appear here" >Once results are published and attendance is recorded.</Empty> : (
        <div className="grid g2">
          <Card title="Examination performance trend"><TrendChart data={d.trend} x="exam" lines={[{ key: 'percentage', name: 'Percentage' }]} /></Card>
          <Card title={`Subject-wise · ${d.latestExam?.name || ''}`}><BarsChart data={d.subjectWise} x="subject" bars={[{ key: 'percentage', name: 'Percentage', color: 'rgb(var(--c-primary))' }]} domain={[0, 100]} unit="%" /></Card>
          <Card title="Grade distribution"><DonutChart data={d.gradeDistribution} name="grade" value="count" /></Card>
          <Card title="Attendance trend"><TrendChart data={d.attendanceTrend} x="month" lines={[{ key: 'percentage', name: 'Attendance %', color: 'rgb(var(--c-success))' }]} /></Card>
          <Card title="Personal improvement" className="g-full">{d.improvement.length ? <DataTable rows={d.improvement} rowKey="subject" columns={[{ label: 'Subject', key: 'subject' }, { label: 'Previous', render: (r) => `${r.previous}%` }, { label: 'Latest', render: (r) => `${r.latest}%` }, { label: 'Change', render: (r) => <Badge tone={r.change >= 0 ? 'green' : 'red'}>{r.change >= 0 ? '▲' : '▼'} {Math.abs(r.change)}%</Badge> }]} /> : <Empty title="Needs two published results to compare" />}</Card>
        </div>))}</Async>
    </div>
  );
}

/** The school calendar. The student's own view also carries exams and homework deadlines; every other portal reads the school's holidays and events, which the School Admin keeps up to date. */
export function StudentCalendar({ base = S, subtitle = 'Exams, holidays, events and homework deadlines' }) {
  const [view, setView] = useState('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [agendaEnd] = useState(() => new Date(Date.now() + 90 * 864e5).toLocaleDateString('en-CA'));
  const [todayIso] = useState(() => new Date().toLocaleDateString('en-CA'));
  const ym = (d) => d.toLocaleDateString('en-CA').slice(0, 7);
  const from = `${ym(anchor)}-01`;
  const to = `${ym(anchor)}-${String(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  const cal = useApi(`${base}/calendar`, { from: view === 'agenda' ? todayIso : from, to: view === 'agenda' ? agendaEnd : to });
  const [picked, setPicked] = useState(null); // the day whose full list is shown below, like tapping a day in a phone calendar
  const colour = { holiday: 'red', exam: 'amber', deadline: 'blue', event: 'primary', ptm: 'primary' };
  const tone = (e) => (e.kind === 'government' ? 'green' : colour[e.type]);
  const tag = (e) => (e.kind === 'government' ? 'Government holiday' : label(e.type));
  const byDate = useMemo(() => { const m = new Map(); (cal.data || []).forEach((e) => { for (let d = new Date(`${e.date}T00:00:00`); d <= new Date(`${e.endDate || e.date}T00:00:00`); d.setDate(d.getDate() + 1)) { const k = d.toLocaleDateString('en-CA'); if (!m.has(k)) m.set(k, []); m.get(k).push(e); } }); return m; }, [cal.data]);
  const days = useMemo(() => { const y = anchor.getFullYear(); const m = anchor.getMonth(); const n = new Date(y, m + 1, 0).getDate(); const offset = (new Date(y, m, 1).getDay() + 6) % 7; return { offset, list: Array.from({ length: n }, (_, i) => new Date(y, m, i + 1).toLocaleDateString('en-CA')) }; }, [anchor]);
  const week = useMemo(() => { const d = new Date(anchor); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return x.toLocaleDateString('en-CA'); }); }, [anchor]);
  const shift = (n) => { const d = new Date(anchor); if (view === 'week') d.setDate(d.getDate() + 7 * n); else d.setMonth(d.getMonth() + n); setAnchor(d); };
  return (
    <div className="stack">
      <PageHeader title="School calendar" subtitle={subtitle} actions={view !== 'agenda' && <><Button onClick={() => shift(-1)}>←</Button><b>{anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b><Button onClick={() => shift(1)}>→</Button></>} />
      <Tabs tabs={[['month', 'Monthly'], ['week', 'Weekly'], ['agenda', 'Agenda']]} value={view} onChange={setView} />
      <Async state={cal}>{(items) => (<Card>
        {view === 'month' && <div className="cal" style={{ gap: 6 }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => <div key={x} className="h">{x}</div>)}{Array.from({ length: days.offset }).map((_, i) => <div key={i} className="d blank" />)}
          {days.list.map((d) => <button key={d} type="button" aria-label={`${fmtDate(d, true)}, ${(byDate.get(d) || []).length} event(s)`} aria-pressed={picked === d} onClick={() => setPicked(picked === d ? null : d)} className="d" style={{ aspectRatio: 'auto', minHeight: 78, alignItems: 'start', justifyItems: 'start', padding: 6, overflow: 'hidden', textAlign: 'left', cursor: 'pointer', outline: picked === d ? '2px solid rgb(var(--c-primary))' : d === todayIso ? '1px solid rgb(var(--c-primary))' : undefined }}><div className="small bold">{Number(d.slice(8))}</div>{(byDate.get(d) || []).slice(0, 2).map((e) => <Badge key={e.source + e.id} tone={tone(e)}>{e.title.slice(0, 16)}</Badge>)}{(byDate.get(d) || []).length > 2 && <span className="small muted">+{byDate.get(d).length - 2}</span>}</button>)}</div>}
        {view === 'month' && <div className="legend" style={{ marginTop: 10 }}><span><i style={{ background: 'rgb(var(--c-success))' }} />Government holiday</span><span><i style={{ background: 'rgb(var(--c-danger))' }} />School holiday</span><span><i style={{ background: 'rgb(var(--c-warning))' }} />Exam</span><span><i style={{ background: 'rgb(var(--c-primary))' }} />Event</span><span><i style={{ background: 'rgb(var(--c-info, 10 132 255))' }} />Homework due</span></div>}
        {view === 'month' && picked && <div className="stack-sm" style={{ marginTop: 14 }}><b>{fmtDate(picked, true)}</b>{(byDate.get(picked) || []).length ? (byDate.get(picked) || []).map((e) => <div key={e.source + e.id}><Badge tone={tone(e)}>{tag(e)}</Badge> <b>{e.title}</b>{e.description && <span className="small muted"> · {e.description}</span>}</div>) : <span className="muted small">Nothing on this day.</span>}</div>}
        {view === 'week' && <div className="stack-sm">{week.map((d) => <div key={d} className="period"><div className="time">{dayName(new Date(`${d}T00:00:00`).getDay() || 7).slice(0, 3)} {fmtDate(d)}</div><div className="grow">{(byDate.get(d) || []).map((e) => <div key={e.source + e.id}><Badge tone={tone(e)}>{tag(e)}</Badge> {e.title}</div>)}{!(byDate.get(d) || []).length && <span className="muted small">Nothing scheduled</span>}</div></div>)}</div>}
        {view === 'agenda' && (items.length ? <ul className="timeline">{items.map((e) => <li key={e.source + e.id}><span className="dotc" /><div className="grow"><b>{e.title}</b><div className="small muted">{fmtDate(e.date, true)}{e.endDate && e.endDate !== e.date ? ` – ${fmtDate(e.endDate)}` : ''} {e.description && `· ${e.description}`}</div></div><Badge tone={tone(e)}>{tag(e)}</Badge></li>)}</ul> : <Empty title="Nothing coming up" />)}</Card>)}</Async>
    </div>
  );
}

export function StudentDocuments() {
  const docs = useApi(`${S}/documents`);
  const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="My documents" subtitle="Private to you and the school. Links expire after a few minutes." />
      <Card flush><Async state={docs} empty={<Empty title="No documents have been added" >The school office uploads certificates and reports here.</Empty>}>{(rows) => <DataTable rows={rows} rowKey="id" columns={[{ label: 'Document', render: (d) => <b>{d.name}</b> }, { label: 'Type', render: (d) => label(d.type) }, { label: 'Added', render: (d) => fmtDate(d.uploadedAt, true) }, { label: '', render: (d) => <Button size="sm" onClick={() => run(() => openFile(d.id))}>Open</Button> }]} />}</Async></Card>
    </div>
  );
}

export function StudentSettings() {
  const { user, refresh } = useAuth();
  const [run, busy] = useAction();
  const prefs = user.notificationPrefs || {};
  const cats = ['homework', 'attendance', 'examination', 'results', 'announcements', 'timetable', 'fees', 'library'];
  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <PageHeader title="Settings" />
      <Card title="Language"><Select value={user.language || 'en'} onChange={async (e) => { await run(() => patch('/api/auth/preferences', { language: e.target.value }), 'Saved'); refresh(); }} options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिन्दी' }]} aria-label="Language" /></Card>
      <Card title="Notification preferences"><div className="stack-sm">{cats.map((c) => <label key={c} className="row between"><span>{label(c)}</span><input type="checkbox" checked={prefs[c] !== false} disabled={busy} onChange={async (e) => { await run(() => patch('/api/auth/preferences', { notificationPrefs: { [c]: e.target.checked } }), 'Saved'); refresh(); }} /></label>)}</div></Card>
      <Card title="Account"><p className="muted">Your role and school are set by the school office and cannot be changed here.</p><div className="row"><Link className="btn" to="/account">Change password & manage devices</Link></div></Card>
    </div>
  );
}

export function StudentFees() {
  const f = useApi(`${S}/fees`);
  const [run] = useAction();
  const [paying, setPaying] = useState(false);
  return (
    <div className="stack">
      <PageHeader title="Fee information" subtitle={f.data?.online?.enabled ? 'You can pay online, or at the school\'s finance desk.' : 'Read-only. Payments are made at the school\'s finance desk.'} />
      <Async state={f} empty={null}>{(d) => !d.charges.length ? <Empty title="No fees have been assigned to you yet" /> : (
        <div className="stack">
          <div className="grid g4"><Stat value={fmtMoney(d.totals.assigned)} label="Total fee assigned" sub={d.totals.concession ? `after ${fmtMoney(d.totals.concession)} concession` : undefined} /><Stat value={fmtMoney(d.totals.paid)} label="Paid" tone="green" /><Stat value={fmtMoney(d.totals.pending)} label="Pending" tone="amber" sub={d.totals.nextDue ? `Next due ${fmtDate(d.totals.nextDue, true)}` : undefined} /><Stat value={fmtMoney(d.totals.overdue)} label="Overdue" tone={d.totals.overdue ? 'red' : undefined} /></div>
          {d.online?.enabled && d.totals.pending > 0 && <Card><div className="row between" style={{ flexWrap: 'wrap', gap: 10 }}><div><b>{fmtMoney(d.totals.pending)}</b> is outstanding. {d.online.testMode && <Badge tone="amber">Test mode</Badge>}</div><Button variant="primary" onClick={() => setPaying(true)}>Pay online</Button></div></Card>}
          {paying && <PayOnline fees={d} onClose={() => setPaying(false)} onPaid={() => f.reload()} />}
          {d.advanceOffer?.eligible && <div className="alert ok">Pay all {d.advanceOffer.months} remaining months at the finance desk in one go and the school gives you <b>{d.advanceOffer.offer}</b>: you pay {fmtMoney(d.advanceOffer.payable)} instead of {fmtMoney(d.advanceOffer.payable + d.advanceOffer.discount)} (saving {fmtMoney(d.advanceOffer.discount)}).</div>}
          <Card title="What you are charged for"><div className="row wrap">{d.categories.map((c) => <span key={c.name} className="chip">{c.name}{c.months ? ` (${c.months} months)` : ''}: <b>{fmtMoney(c.total)}</b></span>)}</div></Card>
          <FeeSchedule installments={d.installments} charges={d.charges.map((c) => ({ id: c.id, label: c.label, kind: c.kind, dueDate: c.dueDate, period: c.period, amount: c.amount, concession: c.concession, paid: c.paid, outstanding: c.outstanding, status: c.status, overdue: c.overdue }))} payments={d.payments} onReceipt={(p) => run(() => download(`${S}/fees/receipts/${p.id}.pdf`, `receipt-${p.receiptNo}.pdf`))} />
          <Card title="Payment history" flush><DataTable rows={d.payments} empty="No payments yet" columns={[{ label: 'Receipt', render: (p) => <b>{p.receiptNo}</b> }, { label: 'Date', render: (p) => fmtDate(p.paidOn, true) }, { label: 'Amount', render: (p) => <span style={{ color: p.kind === 'reversal' ? 'var(--red)' : undefined }}>{p.kind === 'reversal' ? '−' : ''}{fmtMoney(p.amount)}</span> }, { label: 'Mode', render: (p) => label(p.mode) }, { label: 'For', render: (p) => p.allocations.join(', ') }, { label: '', render: (p) => (p.status === 'reversed' ? <Badge tone="red">Reversed</Badge> : p.kind === 'reversal' ? <Badge tone="red">Reversal</Badge> : null) },
            { label: '', render: (p) => <Button size="sm" onClick={() => run(() => download(`${S}/fees/receipts/${p.id}.pdf`, `receipt-${p.receiptNo}.pdf`))}>Receipt</Button> }]} /></Card>
        </div>)}</Async>
    </div>
  );
}
