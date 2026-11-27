import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { Async, Badge, Button, Card, DataTable, Select, Stat, fmtDate } from './ui.jsx';

const PIN = 'atkaksha.library.byClass.show';
const SHOWS = [{ value: 'all', label: 'All students' }, { value: 'borrowed', label: 'Borrowed this year' }, { value: 'never', label: 'Never borrowed' }, { value: 'holding', label: 'Holding a book now' }];
// the chosen "Show" is pinned: it stays as it was whenever a class or section is opened, here or the next time the page is visited
const pinned = () => { try { const v = localStorage.getItem(PIN); return SHOWS.some((o) => o.value === v) ? v : 'all'; } catch { return 'all'; } };

/** Class-wise library view: pick a class (and section), then see who has borrowed a book this year, who holds one now, and who never has. Before a class is chosen, every class at a glance. */
export default function ClassBorrowers({ base, sectionId: fixedSection }) {
  const lookups = useApi(fixedSection ? null : `${base}/lookups`);
  const [classId, setClassId] = useState(''); const [sectionId, setSectionId] = useState(''); const [filter, setFilterState] = useState(pinned);
  const setFilter = (v) => { setFilterState(v); try { localStorage.setItem(PIN, v); } catch { /* private window: the filter just isn't remembered */ } };
  const sid = fixedSection || sectionId;
  const overview = useApi(!fixedSection && !classId ? `${base}/class-overview` : null);
  const q = useApi(sid || classId ? `${base}/class-borrowers` : null, { classId: sid ? undefined : classId, sectionId: sid || undefined, filter });
  const sections = (lookups.data?.sections || []).filter((s) => s.classId === classId);
  const open = (r) => { setClassId(r.classId); setSectionId(r.sectionId); };
  return (
    <div className="stack">
      <div className="row wrap">
        {!fixedSection && <>
          <Select aria-label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }} placeholder="All classes" options={(lookups.data?.classes || []).map((c) => ({ value: c._id, label: c.name }))} />
          <Select aria-label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)} placeholder="All sections" options={sections.map((s) => ({ value: s._id, label: s.name }))} disabled={!classId} />
        </>}
        <Select aria-label="Show" value={filter} onChange={(e) => setFilter(e.target.value)} options={SHOWS} />
        {filter !== 'all' && <Badge tone="blue">Pinned: {SHOWS.find((o) => o.value === filter)?.label}</Badge>}
        {classId && !fixedSection && <Button size="sm" onClick={() => { setClassId(''); setSectionId(''); }}>All classes</Button>}
      </div>
      {!sid && !classId ? (
        <Async skeleton="stats" state={overview}>{(d) => (<>
          <div className="grid g4">
            <Stat value={`${d.totals.borrowedAny} / ${d.totals.students}`} label="Borrowed a book this year" tone="green" />
            <Stat value={d.totals.neverBorrowed} label="Never borrowed" tone={d.totals.neverBorrowed ? 'amber' : 'green'} />
            <Stat value={d.totals.holdingNow} label="Holding a book now" tone="blue" />
            <Stat value={d.totals.overdue} label="With an overdue book" tone={d.totals.overdue ? 'red' : 'green'} />
          </div>
          <Card title="Every class" action={<span className="small muted">{filter === 'all' ? 'Open a class to see its students' : `Opens with "${SHOWS.find((o) => o.value === filter)?.label}" applied`}</span>} flush>
            <DataTable rows={d.rows} rowKey="sectionId" empty="No classes yet" onRowClick={open} columns={[
              { label: 'Class', render: (r) => <b>{r.className} {r.sectionName}</b> }, { label: 'Students', key: 'students' },
              { label: 'Borrowed this year', render: (r) => <><b>{r.borrowedAny}</b> <span className="muted">({r.students ? Math.round((r.borrowedAny / r.students) * 100) : 0}%)</span></> },
              { label: 'Never borrowed', key: 'neverBorrowed' }, { label: 'Holding now', render: (r) => (r.holdingNow ? <Badge tone="blue">{r.holdingNow}</Badge> : <span className="muted">0</span>) },
              { label: 'Overdue', render: (r) => (r.overdue ? <Badge tone="red">{r.overdue}</Badge> : <span className="muted">0</span>) },
            ]} />
          </Card>
        </>)}</Async>
      ) : (
        <Async skeleton="stats" state={q}>{(d) => (<>
          <div className="grid g4">
            <Stat value={`${d.summary.borrowedAny} / ${d.summary.students}`} label="Borrowed a book this year" tone="green" />
            <Stat value={d.summary.neverBorrowed} label="Never borrowed" tone={d.summary.neverBorrowed ? 'amber' : 'green'} />
            <Stat value={d.summary.holdingNow} label="Holding a book now" tone="blue" />
            <Stat value={d.summary.overdue} label="With an overdue book" tone={d.summary.overdue ? 'red' : 'green'} />
          </div>
          <Card title={`${d.className}${sid ? ` ${d.sections[0]?.name || ''}` : ''}`} flush>
            <DataTable rows={d.students} rowKey="studentId" empty="No students match" columns={[
              { label: 'Roll', key: 'rollNo' }, { label: 'Student', render: (s) => <><b>{s.name}</b><div className="small muted">{s.admissionNo}{d.sections.length > 1 ? ` · ${s.section}` : ''}</div></> },
              { label: 'Borrowed', render: (s) => s.borrowed ? <Badge tone="green">{s.borrowed}</Badge> : <Badge>Never</Badge> },
              { label: 'Holding now', render: (s) => s.holding.length ? s.holding.map((h, i) => <div key={i}>{h.title} <Badge tone={h.overdue ? 'red' : 'blue'}>{h.overdue ? 'overdue' : `due ${fmtDate(h.dueDate)}`}</Badge></div>) : <span className="muted">—</span> },
              { label: 'Last borrowed', render: (s) => s.lastIssuedOn ? <>{s.lastBook}<div className="small muted">{fmtDate(s.lastIssuedOn, true)}</div></> : '—' },
            ]} />
          </Card>
        </>)}</Async>
      )}
    </div>
  );
}
