import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { Async, Badge, Button, Card, DataTable, Empty, PageHeader, Stat, fmtDate, label } from '../../components/ui.jsx';
import { BarsChart, TrendChart } from '../../components/Charts.jsx';

const tone = (p, pass = 33) => (p == null ? '' : p >= 75 ? 'green' : p >= 50 ? 'blue' : p >= pass ? 'amber' : 'red');
const pct = (n) => (n == null ? '—' : `${n}%`);

/** A section that opens and closes, so a long page stays easy to scan. */
function Fold({ title, hint, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card flush>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', padding: '14px 18px' }}>
        <span><b>{title}</b>{hint && <span className="small muted" style={{ marginLeft: 10 }}>{hint}</span>}</span>
        <ChevronDown size={18} aria-hidden style={{ transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && <div style={{ borderTop: '1px solid var(--border)', padding: 0 }}>{children}</div>}
    </Card>
  );
}

const Row = ({ k, v }) => (v ? <><dt>{k}</dt><dd>{v}</dd></> : null);

/**
 * One student's marks, and only marks. A card of who they are on top (class, guardians, phone, bus), then every part of their marks analysis
 * in sections that open and close. Fees, library and attendance live on the full student page, not here.
 */
export default function StudentMarks() {
  const { id } = useParams();
  const nav = useNavigate();
  const q = useApi(`/api/school/analysis/students/${id}`);
  return (
    <div className="stack">
      <PageHeader title={q.data ? q.data.profile.name : 'Student marks'} subtitle="Marks and exam analysis" actions={<Button onClick={() => nav(-1)}>← Back to the list</Button>} />
      <Async skeleton="stats" state={q}>{(d) => {
        const p = d.profile; const sm = d.summary; const pass = sm.passMark;
        return (
          <>
            <Card title="Student">
              <div className="grid g2" style={{ alignItems: 'start' }}>
                <dl className="kv">
                  <Row k="Name" v={<b>{p.name}</b>} /><Row k="Admission no." v={p.admissionNo} /><Row k="Class" v={p.className ? `${p.className}${p.section ? ` ${p.section}` : ''}` : null} /><Row k="Roll no." v={p.rollNo} />
                  <Row k="Gender" v={p.gender ? label(p.gender) : null} /><Row k="Date of birth" v={p.dob ? fmtDate(p.dob, true) : null} /><Row k="House" v={p.house} /><Row k="Phone" v={p.phone} /><Row k="Address" v={p.address} />
                </dl>
                <dl className="kv">
                  {p.guardians.length ? p.guardians.map((g, i) => <Row key={i} k={g.relationship ? label(g.relationship) : 'Guardian'} v={<>{g.name}{g.phone && <> · <a href={`tel:${g.phone}`}>{g.phone}</a></>}</>} />) : <Row k="Guardian" v={<span className="muted">None on file</span>} />}
                  {p.bus ? <Row k="Bus" v={<>{p.bus.busNo}{p.bus.routeName ? ` · ${p.bus.routeName}` : ''}<div className="small muted">Stop: {p.bus.stop}{p.bus.pickupTime ? ` · pick-up ${p.bus.pickupTime}` : ''}{p.bus.dropTime ? ` · drop ${p.bus.dropTime}` : ''}</div>{p.bus.driver && <div className="small muted">Driver: {p.bus.driver.name}{p.bus.driver.phone ? ` · ${p.bus.driver.phone}` : ''}</div>}</>} /> : <Row k="Bus" v={<span className="muted">Does not use the school bus</span>} />}
                </dl>
              </div>
            </Card>

            {!d.exams.length ? <Card><Empty title="No results published yet">This student's marks appear here after the exams they sat are published.</Empty></Card> : (<>
              <div className="grid g4">
                <Stat value={pct(sm.average)} label="Average" sub={`${sm.examsTaken} exam(s)`} tone={sm.average >= pass + 10 ? 'green' : 'amber'} />
                <Stat value={sm.latest ? `${sm.latest.percentage}%` : '—'} label="Latest exam" sub={sm.latest ? `${sm.latest.exam}${sm.latest.rank ? ` · rank ${sm.latest.rank} of ${sm.latest.outOf}` : ''}` : ''} />
                <Stat value={sm.best ? sm.best.subject : '—'} label="Strongest subject" sub={sm.best ? pct(sm.best.average) : ''} tone="green" />
                <Stat value={sm.weakest ? sm.weakest.subject : '—'} label="Weakest subject" sub={sm.weakest ? pct(sm.weakest.average) : ''} tone={sm.weakest && sm.weakest.average < pass + 10 ? 'amber' : undefined} />
              </div>

              <Fold title="Marks across exams" hint={`${d.exams.length} exam(s)`} defaultOpen>
                <DataTable rows={d.exams} rowKey="id" columns={[
                  { label: 'Exam', sort: (e) => e.exam, render: (e) => <><b>{e.exam}</b>{e.type && <div className="small muted">{label(e.type)}</div>}</> }, { label: 'Date', sort: (e) => e.date || '', render: (e) => (e.date ? fmtDate(e.date, true) : '—') },
                  { label: 'Marks', render: (e) => `${e.obtained ?? '—'} / ${e.max ?? '—'}` }, { label: 'Percentage', sort: (e) => e.percentage ?? -1, render: (e) => <Badge tone={tone(e.percentage, pass)}>{pct(e.percentage)}</Badge> },
                  { label: 'Grade', key: 'grade' }, { label: 'Rank in class', sort: (e) => e.rank ?? 9999, render: (e) => (e.rank ? `${e.rank} of ${e.outOf}` : '—') }, { label: 'Result', render: (e) => <Badge tone={e.result === 'pass' ? 'green' : 'red'}>{label(e.result || '')}</Badge> },
                ]} />
              </Fold>

              <Fold title="Subject-wise average" hint="across all exams">
                <DataTable rows={d.subjectAverages} rowKey="subject" columns={[
                  { label: 'Subject', sort: (s) => s.subject, render: (s) => <b>{s.subject}</b> }, { label: 'Average', sort: (s) => s.average, render: (s) => <Badge tone={tone(s.average, pass)}>{pct(s.average)}</Badge> },
                  { label: 'Highest', sort: (s) => s.highest, render: (s) => pct(s.highest) }, { label: 'Lowest', sort: (s) => s.lowest, render: (s) => pct(s.lowest) }, { label: 'Exams', key: 'exams' },
                ]} />
              </Fold>

              <Fold title="Exam by exam, subject by subject" hint="the marks entered for each paper">
                <div className="stack" style={{ padding: 16 }}>
                  {d.exams.map((e) => (
                    <div key={e.id}>
                      <div className="row between"><b>{e.exam}</b><span className="small muted">{pct(e.percentage)} · grade {e.grade}{e.rank ? ` · rank ${e.rank} of ${e.outOf}` : ''}</span></div>
                      <DataTable rows={e.subjects} rowKey="subject" columns={[
                        { label: 'Subject', render: (x) => <b>{x.subject}</b> },
                        { label: 'Parts', render: (x) => (x.components?.length ? x.components.map((c) => `${c.label} ${c.value ?? '—'}/${c.max}`).join(' · ') : '—') },
                        { label: 'Marks', render: (x) => (x.absent ? <Badge tone="red">Absent</Badge> : `${x.obtained ?? '—'} / ${x.max ?? '—'}`) }, { label: '%', render: (x) => (x.absent ? '—' : <Badge tone={tone(x.percentage, pass)}>{pct(x.percentage)}</Badge>) }, { label: 'Grade', key: 'grade' },
                      ]} />
                    </div>
                  ))}
                </div>
              </Fold>

              <Fold title="Graphs" hint="progress over the exams, and subjects compared">
                <div className="grid g2" style={{ padding: 16 }}>
                  <Card title="Percentage in each exam"><TrendChart data={d.exams.map((e) => ({ exam: e.exam, Percentage: e.percentage }))} x="exam" lines={[{ key: 'Percentage' }]} /></Card>
                  <Card title="Average by subject"><BarsChart data={d.subjectAverages.map((s) => ({ subject: s.subject, Average: s.average }))} x="subject" bars={[{ key: 'Average', color: 'rgb(var(--c-primary))' }]} domain={[0, 100]} unit="%" /></Card>
                </div>
              </Fold>
            </>)}
            <p className="small muted">This page shows marks only. For fees, library, attendance and remarks open the <Link to={`/admin/students/${p.id}`}>full student page</Link>.</p>
          </>
        );
      }}</Async>
    </div>
  );
}
