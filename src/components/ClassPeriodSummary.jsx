import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Async, Badge, Card, DataTable, Empty, Input, Stat, Tabs, fmtPct } from './ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { useOffice } from '../context/ClassOffice.jsx';

const n1 = (x) => (Number.isInteger(x) ? x : x.toFixed(1));
const TONE = { good: 'green', watch: 'amber', low: 'red', none: '' };
const WORD = { good: 'On track', watch: 'Keep an eye', low: 'Below target', none: 'Nothing marked' };

/**
 * When attendance is taken period by period, the class teacher (and the office) checks the whole class here: how the class is doing in each subject,
 * and every student's attendance in lessons, with the ones who need attention easy to find. Counted from the submitted period registers.
 */
export function ClassPeriodSummary({ sectionId }) {
  const { api, nav } = useOffice();
  const q = useApi(`${api}/sections/${sectionId}/period-attendance`);
  const [find, setFind] = useState(''); const [only, setOnly] = useState(false);
  return (
    <Async skeleton="datatable" state={q}>{(d) => {
      if (!d.totals.marked) return <Empty title="No period has been marked yet">Each student's attendance appears here once teachers submit their period registers.</Empty>;
      const text = find.trim().toLowerCase();
      const rows = d.students.filter((s) => (!only || s.state === 'low') && (!text || `${s.name} ${s.rollNo} ${s.admissionNo || ''}`.toLowerCase().includes(text)));
      return (
        <div className="stack">
          <div className="grid g4">
            <Stat value={fmtPct(d.totals.percentage)} label="Class attendance in periods" tone={d.totals.percentage >= d.target ? 'green' : 'amber'} sub={`Target ${d.target}%`} />
            <Stat value={d.totals.students} label="Students" sub={`${d.totals.marked} with periods marked`} />
            <Stat value={d.totals.below} label={`Below ${d.target}%`} tone={d.totals.below ? 'red' : 'green'} sub={d.totals.below ? 'Open the list below' : 'Everyone is on track'} />
            <Stat value={d.subjects.length} label="Subjects marked" sub={d.subjects[0] ? `Lowest: ${d.subjects[0].subject} ${d.subjects[0].percentage}%` : undefined} />
          </div>
          <Card title="The class, subject by subject">
            <div className="sa-subjects">{d.subjects.map((s) => (
              <div key={s.subjectId} className="pg-subj"><div className="row between"><span>{s.subject} <span className="muted small">· {s.periods} {s.periods === 1 ? 'mark' : 'marks'}</span></span><b>{s.percentage}%</b></div><div className="pg-bar" role="img" aria-label={`${s.subject} ${s.percentage}%`}><i style={{ width: `${s.percentage}%` }} /></div></div>))}</div>
          </Card>
          <Card title="Every student" action={<div className="row" style={{ gap: 8 }}>
            <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Below {d.target}% only</label>
            <Input aria-label="Find a student" placeholder="Find by name or roll" value={find} onChange={(e) => setFind(e.target.value)} style={{ width: 200 }} /></div>} flush>
            <DataTable rows={rows} rowKey="studentId" empty="No student matches" columns={[
              { label: 'Roll', sort: (a, b) => a.rollNo - b.rollNo, render: (s) => s.rollNo },
              { label: 'Student', sort: (a, b) => a.name.localeCompare(b.name), render: (s) => <Link to={`${nav}/students/${s.studentId}`}><b>{s.name}</b></Link> },
              { label: 'Attendance', sort: (a, b) => (a.percentage ?? -1) - (b.percentage ?? -1), render: (s) => (s.percentage == null ? <span className="muted">—</span> : <div className="stack" style={{ gap: 4, minWidth: 120 }}><b>{s.percentage}%</b><div className="pg-bar" role="img" aria-label={`${s.percentage}%`}><i style={{ width: `${s.percentage}%` }} /></div></div>) },
              { label: 'Periods attended', render: (s) => (s.periods ? `${n1(s.attended)} of ${s.periods}` : '—') },
              { label: 'Missed', sort: (a, b) => a.absent - b.absent, render: (s) => s.absent },
              { label: 'Late', render: (s) => s.late },
              { label: 'Subjects below target', sort: (a, b) => a.below - b.below, render: (s) => (s.below ? <Badge tone="red">{s.below}</Badge> : <span className="muted">0</span>) },
              { label: 'Standing', render: (s) => <Badge tone={TONE[s.state]}>{WORD[s.state]}</Badge> }]} />
          </Card>
        </div>);
    }}</Async>
  );
}

/** The Attendance tab of a class when the school takes attendance period by period: the whole class first, then one day at a time. */
export function ClassAttendanceTabs({ sectionId, children }) {
  const [tab, setTab] = useState('class');
  return (
    <div className="stack">
      <Tabs tabs={[['class', 'Whole class'], ['days', 'Day by day']]} value={tab} onChange={setTab} />
      {tab === 'class' ? <ClassPeriodSummary sectionId={sectionId} /> : children}
    </div>
  );
}
