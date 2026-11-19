import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { Async, Badge, Card, DataTable, Empty, Field, Input, Select, Stat, fmtDate, label } from './ui.jsx';
import { BarsChart, DonutChart } from './Charts.jsx';
import FilterMenu from './FilterMenu.jsx';

const tone = (p) => (p == null ? '' : p >= 75 ? 'green' : p >= 50 ? 'blue' : p >= 33 ? 'amber' : 'red');
const BANDS = [['Below 33%', 0, 33], ['33–50%', 33, 50], ['50–60%', 50, 60], ['60–75%', 60, 75], ['75–90%', 75, 90], ['90% and above', 90, 101]];

/**
 * Exam analysis for a class (all sections) or a single section: how many exams were held, how each exam went,
 * and every student's marks across all of them, ranked. Includes tests teachers added themselves.
 * `view` is "summary" (tables) or "graphs" (the same numbers as charts).
 */
export default function ExamAnalysis({ classId, sectionId, view = 'summary' }) {
  const nav = useNavigate();
  const q = useApi(classId || sectionId ? '/api/school/analysis/exams' : null, { classId: sectionId ? undefined : classId, sectionId: sectionId || undefined });
  const [find, setFind] = useState(''); const [secFilter, setSecFilter] = useState(''); const [result, setResult] = useState('');
  if (!classId && !sectionId) return <Empty title="Choose a class to see its exam analysis" />;
  return (
    <Async state={q}>{(d) => {
      if (!d.students.length) return <Empty title="No students in this class this year" />;
      const subjects = [...new Set(d.exams.flatMap((e) => e.subjects.map((s) => s.subject)))].sort();
      const stats = (
        <div className="grid g4">
          <Stat value={d.examsHeld} label="Exams held" sub={d.examsPending.length ? `${d.examsPending.length} more scheduled` : 'with published results'} tone="blue" />
          <Stat value={d.summary.students} label="Students" sub={d.sections.map((s) => s.name).join(', ')} />
          <Stat value={d.summary.classAverage != null ? `${d.summary.classAverage}%` : '—'} label="Class average" tone="green" />
          <Stat value={d.summary.needsAttention} label="Need attention" sub={`average below ${d.summary.passMark + 10}%`} tone={d.summary.needsAttention ? 'amber' : 'green'} />
        </div>
      );
      if (d.examsHeld === 0) return <div className="stack">{stats}<Empty title="No results published yet">Marks appear here after the teachers enter them and the exam is published.</Empty></div>;
      return view === 'graphs' ? <Graphs d={d} subjects={subjects} stats={stats} /> : (
        <div className="stack">
          {stats}
          <div className="grid g2" style={{ alignItems: 'start' }}>
            <Card title="Exams held" flush><DataTable rows={d.exams} rowKey="id" columns={[
              { label: 'Exam', sort: (e) => e.name, render: (e) => <><b>{e.name}</b> <Badge>{label(e.type)}</Badge><div className="small muted">{e.date ? fmtDate(e.date, true) : ''}{e.createdBy ? ` · ${e.createdBy}` : ''}</div></> },
              { label: 'Avg', sort: (e) => e.average ?? -1, render: (e) => <Badge tone={tone(e.average)}>{e.average ?? '—'}%</Badge> }, { label: 'Pass', sort: (e) => e.passPercent ?? -1, render: (e) => `${e.passPercent ?? '—'}%` },
              { label: 'Highest', render: (e) => e.highest ? `${e.highest.name} (${e.highest.percentage}%)` : '—' }, { label: 'Lowest', render: (e) => e.lowest ? `${e.lowest.name} (${e.lowest.percentage}%)` : '—' },
            ]} /></Card>
            {subjects.length > 0 && <Card title="Subject-wise average" flush><DataTable rows={subjects.map((s) => ({ subject: s }))} rowKey="subject" columns={[{ label: 'Subject', sort: (r) => r.subject, render: (r) => <b>{r.subject}</b> },
              ...d.exams.map((e) => ({ label: e.name, sort: (r) => e.subjects.find((x) => x.subject === r.subject)?.average ?? -1, render: (r) => { const v = e.subjects.find((x) => x.subject === r.subject)?.average; return v == null ? '—' : <Badge tone={tone(v)}>{v}%</Badge>; } }))]} /></Card>}
          </div>
          <StudentList d={d} nav={nav} find={find} setFind={setFind} secFilter={secFilter} setSecFilter={setSecFilter} result={result} setResult={setResult} />
        </div>
      );
    }}</Async>
  );
}

/** Every student with their marks in every exam. Find one by name or admission number, narrow by section or result; click for their marks. */
function StudentList({ d, nav, find, setFind, secFilter, setSecFilter, result, setResult }) {
  const needle = find.trim().toLowerCase();
  const rows = useMemo(() => d.students.filter((s) => (!needle || `${s.name} ${s.admissionNo}`.toLowerCase().includes(needle)) && (!secFilter || s.section === secFilter)
    && (!result || (result === 'below' ? s.average != null && s.average < d.summary.passMark + 10 : result === 'top' ? s.average != null && s.average >= 75 : s.average == null))), [d, needle, secFilter, result]);
  return (
    <Card title={`Every student, every exam (${rows.length}${rows.length !== d.students.length ? ` of ${d.students.length}` : ''}) — click a student to see their marks`} flush>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'end', padding: '12px 18px' }}>
        <Field label="Find a student"><Input aria-label="Find a student" placeholder="Name or admission number" value={find} onChange={(e) => setFind(e.target.value)} /></Field>
        <FilterMenu count={[secFilter, result].filter(Boolean).length} onClear={() => { setSecFilter(''); setResult(''); }}>
          {d.sections.length > 1 && <Field label="Section"><Select aria-label="Section filter" value={secFilter} onChange={(e) => setSecFilter(e.target.value)} placeholder="All sections" options={d.sections.map((s) => ({ value: s.name, label: s.name }))} /></Field>}
          <Field label="Show"><Select aria-label="Result filter" value={result} onChange={(e) => setResult(e.target.value)} placeholder="Everyone" options={[{ value: 'top', label: '75% and above' }, { value: 'below', label: `Need attention (below ${d.summary.passMark + 10}%)` }, { value: 'none', label: 'No marks yet' }]} /></Field>
        </FilterMenu>
      </div>
      <DataTable rows={rows} rowKey="studentId" empty="No student matches" onRowClick={(s) => nav(`/admin/exams/student/${s.studentId}`)} columns={[
        { label: 'Rank', sort: (s) => s.rank ?? 9999, render: (s) => s.rank ?? '—' }, { label: 'Roll', sort: (s) => s.rollNo ?? 0, render: (s) => s.rollNo ?? '—' },
        { label: 'Student', sort: (s) => s.name, render: (s) => <><b>{s.name}</b><div className="small muted">{s.admissionNo}</div></> }, ...(d.sections.length > 1 ? [{ label: 'Sec', sort: (s) => s.section, render: (s) => s.section }] : []),
        ...d.exams.map((e) => ({ label: e.name, sort: (s) => s.scores[e.id]?.percentage ?? -1, render: (s) => { const c = s.scores[e.id]; return c ? <span>{c.percentage}% <span className="muted small">{c.grade}</span></span> : <span className="muted">—</span>; } })),
        { label: 'Average', sort: (s) => s.average ?? -1, render: (s) => s.average != null ? <Badge tone={tone(s.average)}>{s.average}%</Badge> : '—' },
      ]} />
    </Card>
  );
}

/** The same numbers as charts: how each exam went, subjects, grades, how marks are spread, and sections side by side. */
function Graphs({ d, subjects, stats }) {
  const grades = useMemo(() => { const m = new Map(); for (const s of d.students) for (const c of Object.values(s.scores)) if (c.grade) m.set(c.grade, (m.get(c.grade) || 0) + 1); return [...m.entries()].map(([name, value]) => ({ name: `Grade ${name}`, value })).sort((a, b) => a.name.localeCompare(b.name)); }, [d]);
  const bands = BANDS.map(([name, lo, hi]) => ({ band: name, Students: d.students.filter((s) => s.average != null && s.average >= lo && s.average < hi).length }));
  const subjectAvg = subjects.map((sub) => { const v = d.exams.map((e) => e.subjects.find((x) => x.subject === sub)?.average).filter((x) => x != null); return { subject: sub, Average: v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null }; });
  const bySection = d.sections.map((sec) => { const v = d.students.filter((s) => s.section === sec.name && s.average != null).map((s) => s.average); return { section: sec.name, Average: v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null }; });
  return (
    <div className="stack">
      {stats}
      <div className="grid g2">
        <Card title="Average and pass rate by exam"><BarsChart data={d.exams.map((e) => ({ exam: e.name, Average: e.average, 'Pass %': e.passPercent }))} x="exam" bars={[{ key: 'Average' }, { key: 'Pass %' }]} domain={[0, 100]} unit="%" /></Card>
        <Card title="Average by subject"><BarsChart data={subjectAvg} x="subject" bars={[{ key: 'Average', color: 'rgb(var(--c-primary))' }]} domain={[0, 100]} unit="%" /></Card>
      </div>
      <div className="grid g2">
        <Card title="How marks are spread (students by average)"><BarsChart data={bands} x="band" bars={[{ key: 'Students', color: 'rgb(var(--c-primary))' }]} /></Card>
        <Card title="Grades awarded"><DonutChart data={grades} /></Card>
      </div>
      {d.sections.length > 1 && <Card title="Sections compared (class average)"><BarsChart data={bySection} x="section" bars={[{ key: 'Average', color: 'rgb(var(--c-success))' }]} domain={[0, 100]} unit="%" /></Card>}
    </div>
  );
}
