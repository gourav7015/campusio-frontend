import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { Async, Badge, Card, DataTable, Empty, Stat, fmtDate, label } from './ui.jsx';
import { BarsChart, DonutChart } from './Charts.jsx';

const pct = (n) => (n == null ? '—' : `${n}%`);
const tone = (n, pass) => (n == null ? '' : n >= 75 ? 'green' : n >= Math.max(pass + 17, 50) ? 'blue' : n >= pass ? 'amber' : 'red');

/** The whole school's published results at a glance, shown before a class is chosen. Click a class to open its own analysis. */
export default function ExamOverview({ onPickClass, view = 'summary' }) {
  const nav = useNavigate();
  const q = useApi('/api/school/analysis/overview');
  return (
    <Async state={q}>{(d) => {
      const t = d.totals;
      if (!t.results) {
        return <Card><Empty title="No results have been published yet">{t.examsScheduled ? `${t.examsScheduled} exam(s) are set up. School-wide statistics appear here once marks are approved and results are published.` : 'Create an examination under “Examinations & marks”. Statistics appear here once results are published.'}</Empty></Card>;
      }
      const weakest = [...d.subjects].sort((a, b) => a.average - b.average);
      return (
        <div className="stack">
          <div className="grid g4">
            <Stat value={pct(t.average)} label="School average" sub={`${t.results.toLocaleString('en-IN')} results`} tone={tone(t.average, t.passMark) === 'red' ? 'red' : 'green'} />
            <Stat value={pct(t.passRate)} label="Pass rate" sub={`pass mark ${t.passMark}%`} tone={t.passRate >= 80 ? 'green' : 'amber'} />
            <Stat value={`${t.examsWithResults} of ${t.examsScheduled}`} label="Exams with results" sub="this session" />
            <Stat value={t.students.toLocaleString('en-IN')} label="Students assessed" sub={`${t.failingStudents.toLocaleString('en-IN')} failed at least one exam`} tone={t.failingStudents ? 'amber' : 'green'} />
          </div>

          {view === 'graphs' ? (
            <div className="stack">
              <div className="grid g-main">
                <Card title="Average by class"><BarsChart data={d.classes} x="className" bars={[{ key: 'average', name: 'Average %', color: 'rgb(var(--c-primary))' }]} domain={[0, 100]} unit="%" /></Card>
                <Card title="Grades"><DonutChart data={d.grades.map((g) => ({ name: `Grade ${g.grade}`, value: g.count }))} /></Card>
              </div>
              <div className="grid g2">
                <Card title="Pass rate by class"><BarsChart data={d.classes} x="className" bars={[{ key: 'passRate', name: 'Pass rate %', color: 'rgb(var(--c-success))' }]} domain={[0, 100]} unit="%" /></Card>
                <Card title="Average by examination"><BarsChart data={d.exams.map((e) => ({ exam: e.name, Average: e.average, 'Pass rate': e.passRate }))} x="exam" bars={[{ key: 'Average' }, { key: 'Pass rate' }]} domain={[0, 100]} unit="%" /></Card>
              </div>
              <Card title="Average by subject"><BarsChart data={d.subjects.map((x) => ({ subject: x.subject, Average: x.average }))} x="subject" bars={[{ key: 'Average', color: 'rgb(var(--c-primary))' }]} domain={[0, 100]} unit="%" /></Card>
            </div>
          ) : (<>
          <div className="grid g2" style={{ alignItems: 'start' }}>
            <Card title="Examinations held" flush>
              <DataTable rows={d.exams} columns={[
                { label: 'Exam', sort: (e) => e.name, render: (e) => <><b>{e.name}</b>{e.type && <div className="small muted">{label(e.type)}</div>}</> }, { label: 'Date', sort: (e) => e.date || '', render: (e) => (e.date ? fmtDate(e.date, true) : '—') },
                { label: 'Results', sort: (e) => e.results, render: (e) => e.results.toLocaleString('en-IN') }, { label: 'Average', sort: (e) => e.average, render: (e) => pct(e.average) }, { label: 'Pass rate', sort: (e) => e.passRate ?? -1, render: (e) => pct(e.passRate) },
              ]} />
            </Card>
            <Card title="Subject-wise average" flush>
              <DataTable rows={weakest} rowKey="subject" columns={[
                { label: 'Subject', sort: (s) => s.subject, render: (s) => <b>{s.subject}</b> }, { label: 'Average', sort: (s) => s.average, render: (s) => <Badge tone={tone(s.average, t.passMark)}>{pct(s.average)}</Badge> },
                { label: 'Below pass mark', sort: (s) => s.belowPercent ?? 0, render: (s) => `${s.belowPass.toLocaleString('en-IN')} (${pct(s.belowPercent)})` },
              ]} />
              <p className="small muted" style={{ padding: '8px 18px 12px' }}>Weakest subject first. Click a heading to sort.</p>
            </Card>
          </div>

          <Card title="Classes compared" flush>
            <DataTable rows={d.classes} rowKey="classId" onRowClick={(c) => onPickClass(c.classId)} columns={[
              { label: 'Class', sort: (c) => c.level, render: (c) => <b>{c.className}</b> }, { label: 'Students', sort: (c) => c.students, render: (c) => c.students.toLocaleString('en-IN') },
              { label: 'Average', sort: (c) => c.average, render: (c) => <Badge tone={tone(c.average, t.passMark)}>{pct(c.average)}</Badge> },
              { label: 'Pass rate', sort: (c) => c.passRate ?? -1, render: (c) => pct(c.passRate) }, { label: 'Highest', sort: (c) => c.highest, render: (c) => pct(c.highest) },
            ]} />
            <p className="small muted" style={{ padding: '8px 18px 12px' }}>Click a class to see its exams and every student's performance.</p>
          </Card>

          <div className="grid g2">
            <Card title="Top performers" flush>
              <DataTable rows={d.top} rowKey="studentId" onRowClick={(s) => nav(`/admin/exams/student/${s.studentId}`)} columns={[{ label: 'Student', render: (s) => <><b>{s.name}</b><div className="small muted">{s.admissionNo}</div></> }, { label: 'Class', render: (s) => s.className }, { label: 'Average', render: (s) => <Badge tone="green">{pct(s.average)}</Badge> }]} />
            </Card>
            <Card title="Need the most support" flush>
              <DataTable rows={d.needSupport} rowKey="studentId" onRowClick={(s) => nav(`/admin/exams/student/${s.studentId}`)} columns={[{ label: 'Student', render: (s) => <><b>{s.name}</b><div className="small muted">{s.admissionNo}</div></> }, { label: 'Class', render: (s) => s.className }, { label: 'Average', render: (s) => <Badge tone={tone(s.average, t.passMark)}>{pct(s.average)}</Badge> }]} />
              <p className="small muted" style={{ padding: '8px 18px 12px' }}>{t.belowPassMark} student(s) average below the pass mark.</p>
            </Card>
          </div>
          </>)}
        </div>
      );
    }}</Async>
  );
}
