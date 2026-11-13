import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { Async, Badge, Card, DataTable, Empty, Stat, fmtDate, label } from './ui.jsx';
import { BarsChart } from './Charts.jsx';

const tone = (p) => (p == null ? '' : p >= 75 ? 'green' : p >= 50 ? 'blue' : p >= 33 ? 'amber' : 'red');

/**
 * Exam analysis for a class (all sections) or a single section: how many exams were held, how each exam went,
 * and every student's marks across all of them, ranked. Includes tests teachers added themselves.
 */
export default function ExamAnalysis({ classId, sectionId }) {
  const nav = useNavigate();
  const q = useApi(classId || sectionId ? '/api/school/analysis/exams' : null, { classId: sectionId ? undefined : classId, sectionId: sectionId || undefined });
  if (!classId && !sectionId) return <Empty title="Choose a class to see its exam analysis" />;
  return (
    <Async state={q}>{(d) => {
      if (!d.students.length) return <Empty title="No students in this class this year" />;
      const subjects = [...new Set(d.exams.flatMap((e) => e.subjects.map((s) => s.subject)))].sort();
      return (
        <div className="stack">
          <div className="grid g4">
            <Stat value={d.examsHeld} label="Exams held" sub={d.examsPending.length ? `${d.examsPending.length} more scheduled` : 'with published results'} tone="blue" />
            <Stat value={d.summary.students} label="Students" sub={d.sections.map((s) => s.name).join(', ')} />
            <Stat value={d.summary.classAverage != null ? `${d.summary.classAverage}%` : '—'} label="Class average" tone="green" />
            <Stat value={d.summary.needsAttention} label="Need attention" sub={`average below ${d.summary.passMark + 10}%`} tone={d.summary.needsAttention ? 'amber' : 'green'} />
          </div>
          {d.examsHeld === 0 ? <Empty title="No results published yet" >Marks appear here after the teachers enter them and the exam is published.</Empty> : (<>
            <div className="grid g2">
              <Card title="Average by exam"><BarsChart data={d.exams.map((e) => ({ exam: e.name, Average: e.average, 'Pass %': e.passPercent }))} x="exam" bars={[{ key: 'Average' }, { key: 'Pass %' }]} domain={[0, 100]} unit="%" /></Card>
              <Card title="Exams held" flush><DataTable rows={d.exams} rowKey="id" columns={[
                { label: 'Exam', render: (e) => <><b>{e.name}</b> <Badge>{label(e.type)}</Badge><div className="small muted">{e.date ? fmtDate(e.date, true) : ''}{e.createdBy ? ` · ${e.createdBy}` : ''}</div></> },
                { label: 'Avg', render: (e) => <Badge tone={tone(e.average)}>{e.average ?? '—'}%</Badge> }, { label: 'Pass', render: (e) => `${e.passPercent ?? '—'}%` },
                { label: 'Highest', render: (e) => e.highest ? `${e.highest.name} (${e.highest.percentage}%)` : '—' }, { label: 'Lowest', render: (e) => e.lowest ? `${e.lowest.name} (${e.lowest.percentage}%)` : '—' },
              ]} /></Card>
            </div>
            {subjects.length > 0 && <Card title="Subject-wise average" flush><DataTable rows={subjects.map((s) => ({ subject: s }))} rowKey="subject" columns={[{ label: 'Subject', render: (r) => <b>{r.subject}</b> },
              ...d.exams.map((e) => ({ label: e.name, render: (r) => { const v = e.subjects.find((x) => x.subject === r.subject)?.average; return v == null ? '—' : <Badge tone={tone(v)}>{v}%</Badge>; } }))]} /></Card>}
            <Card title="Every student, every exam — click a student for the full picture" flush><DataTable rows={d.students} rowKey="studentId" onRowClick={(s) => nav(`/admin/students/${s.studentId}`)} columns={[
              { label: 'Rank', render: (s) => s.rank ?? '—' }, { label: 'Roll', key: 'rollNo' }, { label: 'Student', render: (s) => <b>{s.name}</b> }, ...(d.sections.length > 1 ? [{ label: 'Sec', key: 'section' }] : []),
              ...d.exams.map((e) => ({ label: e.name, render: (s) => { const c = s.scores[e.id]; return c ? <span>{c.percentage}% <span className="muted small">{c.grade}</span></span> : <span className="muted">—</span>; } })),
              { label: 'Average', render: (s) => s.average != null ? <Badge tone={tone(s.average)}>{s.average}%</Badge> : '—' },
            ]} /></Card></>)}
        </div>
      );
    }}</Async>
  );
}
