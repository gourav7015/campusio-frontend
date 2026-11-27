import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Async, Badge, Button, Card, DataTable, Empty, Input, Stat, Tabs, fmtDate, fmtPct } from './ui.jsx';
import { BarsChart } from './Charts.jsx';
import { useApi } from '../hooks/useApi.js';
import { useOffice } from '../context/ClassOffice.jsx';

const TONE = { good: 'green', watch: 'amber', low: 'red', none: '' };
const WORD = { good: 'On track', watch: 'Keep an eye', low: 'Below target', none: 'Nothing marked' };
const RANGES = [['month', 'This month'], ['quarter', 'Last 3 months'], ['year', 'This year']];
const cellTone = (v, target) => (v == null ? '' : v < target ? 'red' : v < target + 10 ? 'amber' : 'green');

/** A small file download from rows already on screen (no server round trip). */
function downloadCsv(name, header, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([[header, ...rows].map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

/** The finder and the "below target only" switch above a list of students. */
function Finder({ find, setFind, only, setOnly, target }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Below {target}% only</label>
      <Input aria-label="Find a student" placeholder="Find by name or roll" value={find} onChange={(e) => setFind(e.target.value)} style={{ width: 200 }} />
    </div>
  );
}
const matches = (s, find, only) => (!only || s.state === 'low') && (!find.trim() || `${s.name} ${s.rollNo} ${s.admissionNo || ''}`.toLowerCase().includes(find.trim().toLowerCase()));

/**
 * Attendance taken period by period: the class teacher (and the office) checks the whole class. The class subject by subject, who needs a word,
 * and every student in every subject (green from the target up, amber within ten points above it... red below it). Counted from submitted period registers.
 */
export function ClassPeriodSummary({ sectionId, range }) {
  const { api, nav } = useOffice();
  const q = useApi(`${api}/sections/${sectionId}/period-attendance`, { range });
  const [find, setFind] = useState(''); const [only, setOnly] = useState(false);
  return (
    <Async skeleton="datatable" state={q}>{(d) => {
      if (!d.totals.marked) return <Empty title="No period was marked in this time">Each student's attendance appears here once teachers submit their period registers.</Empty>;
      const cols = [...d.subjects].sort((a, b) => a.subject.localeCompare(b.subject));
      const rows = d.students.filter((s) => matches(s, find, only));
      const worst = (s) => cols.map((c) => ({ name: c.subject, v: s.cells?.[c.subjectId] })).filter((c) => c.v != null && c.v < d.target).sort((a, b) => a.v - b.v).slice(0, 3);
      const needs = d.students.filter((s) => s.state === 'low').sort((a, b) => a.percentage - b.percentage).slice(0, 5);
      return (
        <div className="stack">
          <div className="grid g4">
            <Stat value={fmtPct(d.totals.percentage)} label="Class attendance in lessons" tone={d.totals.percentage >= d.target ? 'green' : 'amber'} sub={`Target ${d.target}%`} />
            <Stat value={d.totals.students} label="Students" sub={`${d.totals.marked} with lessons marked`} />
            <Stat value={d.totals.below} label={`Below ${d.target}% overall`} tone={d.totals.below ? 'red' : 'green'} sub={d.totals.below ? 'See "Needs a word"' : 'Everyone is on track'} />
            <Stat value={d.subjects[0]?.subject || '—'} label="Lowest subject" tone={d.subjects[0]?.percentage < d.target ? 'amber' : ''} sub={d.subjects[0] ? `${d.subjects[0].percentage}%` : undefined} />
          </div>
          <div className="grid g2">
            <Card title="The class, subject by subject">
              <div className="stack">{d.subjects.map((s) => (
                <div key={s.subjectId} className="pg-subj"><div className="row between"><span>{s.subject} {s.teacher && <span className="muted small">· {s.teacher}</span>}</span><b>{s.percentage}%</b></div><div className="pg-bar" role="img" aria-label={`${s.subject} ${s.percentage}%`}><i style={{ width: `${s.percentage}%` }} /></div></div>))}</div>
            </Card>
            <Card title="Needs a word">
              {needs.length ? <div className="stack" style={{ gap: 0 }}>{needs.map((s) => (
                <div key={s.studentId} className="row between wrap" style={{ gap: 10, padding: '10px 0', borderTop: '1px solid rgb(var(--c-border))' }}>
                  <span><Link to={`${nav}/students/${s.studentId}`}><b>{s.name}</b></Link><div className="small muted">{worst(s).map((w) => `${w.name} ${w.v}%`).join(', ') || 'Below target overall'}</div></span>
                  <Badge tone="red">{s.percentage}%</Badge></div>))}</div> : <div className="muted small">No one is below {d.target}%.</div>}
            </Card>
          </div>
          <Card title="Every student, in every subject" action={<div className="row" style={{ gap: 8 }}><Finder find={find} setFind={setFind} only={only} setOnly={setOnly} target={d.target} />
            <Button size="sm" onClick={() => downloadCsv('attendance-by-subject.csv', ['Roll', 'Student', 'Overall %', ...cols.map((c) => `${c.subject} %`), 'Lessons missed'], d.students.map((s) => [s.rollNo, s.name, s.percentage ?? '', ...cols.map((c) => s.cells?.[c.subjectId] ?? ''), s.absent]))}>Download</Button></div>} flush>
            <DataTable rows={rows} rowKey="studentId" empty="No student matches" columns={[
              { label: 'Roll', sort: (a, b) => a.rollNo - b.rollNo, render: (s) => s.rollNo },
              { label: 'Student', sort: (a, b) => a.name.localeCompare(b.name), render: (s) => <Link to={`${nav}/students/${s.studentId}`}><b>{s.name}</b></Link> },
              { label: 'Overall', sort: (a, b) => (a.percentage ?? -1) - (b.percentage ?? -1), render: (s) => (s.percentage == null ? <span className="muted">—</span> : <Badge tone={cellTone(s.percentage, d.target)}>{s.percentage}%</Badge>) },
              ...cols.map((c) => ({ label: c.subject, sort: (a, b) => (a.cells?.[c.subjectId] ?? -1) - (b.cells?.[c.subjectId] ?? -1), render: (s) => { const v = s.cells?.[c.subjectId]; return v == null ? <span className="muted">—</span> : <Badge tone={cellTone(v, d.target)}>{v}%</Badge>; } })),
              { label: 'Missed', sort: (a, b) => a.absent - b.absent, render: (s) => `${s.absent} ${s.absent === 1 ? 'lesson' : 'lessons'}` }]} />
            <div className="small muted" style={{ padding: '10px 16px' }}>Each cell is that student's attendance in that subject: green from {d.target + 10}%, amber from {d.target}%, red below {d.target}%. Open a student for every lesson.</div>
          </Card>
        </div>);
    }}</Async>
  );
}

/** Attendance taken once a day: every student's days, who needs a word, the class month by month, and where today's register stands. */
export function ClassDaySummary({ sectionId, range }) {
  const { api, nav } = useOffice();
  const q = useApi(`${api}/sections/${sectionId}/day-attendance`, { range });
  const [find, setFind] = useState(''); const [only, setOnly] = useState(false);
  return (
    <Async skeleton="datatable" state={q}>{(d) => {
      const t = d.totals;
      if (!d.students.length || !t.percentage) return <Empty title="No register was submitted in this time">Every student's attendance appears here once the class teacher submits a register.</Empty>;
      const rows = d.students.filter((s) => matches(s, find, only));
      return (
        <div className="stack">
          <div className="grid g4">
            <Stat value={fmtPct(t.percentage)} label="Class attendance" tone={t.percentage >= d.target ? 'green' : 'amber'} sub={`Target ${d.target}%`} />
            <Stat value={t.registerToday === 'submitted' ? `${t.presentToday} of ${t.markedToday}` : '—'} label="Present today" sub={t.registerToday === 'submitted' ? 'Register submitted' : t.registerToday === 'draft' ? 'Register started, not submitted' : 'Not taken yet today'} />
            <Stat value={t.below} label={`Students below ${d.target}%`} tone={t.below ? 'red' : 'green'} />
            <Stat value={t.streak3} label="Absent 3 days or more in a row" tone={t.streak3 ? 'amber' : 'green'} />
          </div>
          <div className="grid g2">
            <Card title="Needs a word">
              {d.needs.length ? <div className="stack" style={{ gap: 0 }}>{d.needs.map((n) => (
                <div key={n.studentId} className="row between wrap" style={{ gap: 10, padding: '10px 0', borderTop: '1px solid rgb(var(--c-border))' }}>
                  <span><Link to={`${nav}/students/${n.studentId}`}><b>{n.name}</b></Link><div className="small muted">{n.why}</div></span>
                  <Badge tone="red">{n.percentage != null ? `${n.percentage}%` : '—'}</Badge></div>))}</div> : <div className="muted small">No one needs a word right now.</div>}
            </Card>
            <Card title="Class attendance by month">
              <BarsChart data={d.byMonth.map((m) => ({ month: m.month, 'Attendance %': m.percentage }))} x="month" bars={[{ key: 'Attendance %' }]} domain={[0, 100]} unit="%" height={190} />
            </Card>
          </div>
          <Card title="Every student" action={<div className="row" style={{ gap: 8 }}><Finder find={find} setFind={setFind} only={only} setOnly={setOnly} target={d.target} />
            <Button size="sm" onClick={() => downloadCsv('attendance-by-student.csv', ['Roll', 'Student', 'Attendance %', 'Days present', 'Absent', 'Late', 'Leave', 'Last absent'], d.students.map((s) => [s.rollNo, s.name, s.percentage ?? '', s.present, s.absent, s.late, s.leave, s.lastAbsent || '']))}>Download</Button></div>} flush>
            <DataTable rows={rows} rowKey="studentId" empty="No student matches" columns={[
              { label: 'Roll', sort: (a, b) => a.rollNo - b.rollNo, render: (s) => s.rollNo },
              { label: 'Student', sort: (a, b) => a.name.localeCompare(b.name), render: (s) => <Link to={`${nav}/students/${s.studentId}`}><b>{s.name}</b></Link> },
              { label: 'Attendance', sort: (a, b) => (a.percentage ?? -1) - (b.percentage ?? -1), render: (s) => (s.percentage == null ? <span className="muted">—</span> : <div className="stack" style={{ gap: 4, minWidth: 120 }}><b>{s.percentage}%</b><div className="pg-bar" role="img" aria-label={`${s.percentage}%`}><i style={{ width: `${s.percentage}%` }} /></div></div>) },
              { label: 'Days present', render: (s) => s.present }, { label: 'Absent', sort: (a, b) => a.absent - b.absent, render: (s) => s.absent }, { label: 'Late', render: (s) => s.late }, { label: 'Leave', render: (s) => s.leave },
              { label: 'Last absent', render: (s) => (s.lastAbsent ? fmtDate(s.lastAbsent, true) : <span className="muted">None</span>) },
              { label: 'Standing', render: (s) => <Badge tone={TONE[s.state]}>{WORD[s.state]}</Badge> }]} />
          </Card>
        </div>);
    }}</Async>
  );
}

/**
 * The Attendance tab of a class: the whole class first (for the school's way of taking attendance), then the working view of the days.
 * `children` is that working view: the register(s) once a day, or the grid of periods for one day.
 */
export function ClassAttendanceTabs({ sectionId, periodWise = true, daysLabel, children }) {
  const [tab, setTab] = useState('class');
  const [range, setRange] = useState('year');
  const Summary = periodWise ? ClassPeriodSummary : ClassDaySummary;
  return (
    <div className="stack">
      <div className="row between wrap">
        <Tabs tabs={[['class', 'Whole class'], ['days', daysLabel || (periodWise ? 'Day by day' : "Today's register")]]} value={tab} onChange={setTab} />
        {tab === 'class' && <Tabs tabs={RANGES} value={range} onChange={setRange} />}
      </div>
      {tab === 'class' ? <Summary sectionId={sectionId} range={range} /> : children}
    </div>
  );
}
