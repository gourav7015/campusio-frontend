import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { Async, Badge, Card, DataTable, Select, Stat, fmtDate } from './ui.jsx';

/** Class-wise library view: pick a class (and section), then see who has borrowed a book this year, who holds one now, and who never has. */
export default function ClassBorrowers({ base, sectionId: fixedSection }) {
  const lookups = useApi(fixedSection ? null : `${base}/lookups`);
  const [classId, setClassId] = useState(''); const [sectionId, setSectionId] = useState(''); const [filter, setFilter] = useState('all');
  const sid = fixedSection || sectionId;
  const q = useApi(sid || classId ? `${base}/class-borrowers` : null, { classId: sid ? undefined : classId, sectionId: sid || undefined, filter });
  const sections = (lookups.data?.sections || []).filter((s) => s.classId === classId);
  return (
    <div className="stack">
      {!fixedSection && (
        <div className="row wrap">
          <Select aria-label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }} placeholder="Choose a class" options={(lookups.data?.classes || []).map((c) => ({ value: c._id, label: c.name }))} />
          <Select aria-label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)} placeholder="All sections" options={sections.map((s) => ({ value: s._id, label: s.name }))} disabled={!classId} />
        </div>
      )}
      {!sid && !classId ? <div className="empty"><div className="big">📚</div><div className="bold">Choose a class to see who has borrowed books</div></div> : (
        <Async state={q}>{(d) => (<>
          <div className="grid g4">
            <Stat value={`${d.summary.borrowedAny} / ${d.summary.students}`} label="Borrowed a book this year" tone="green" />
            <Stat value={d.summary.neverBorrowed} label="Never borrowed" tone={d.summary.neverBorrowed ? 'amber' : 'green'} />
            <Stat value={d.summary.holdingNow} label="Holding a book now" tone="blue" />
            <Stat value={d.summary.overdue} label="With an overdue book" tone={d.summary.overdue ? 'red' : 'green'} />
          </div>
          <Card title={`${d.className}${sid ? ` ${d.sections[0]?.name || ''}` : ''}`} action={<Select aria-label="Show" value={filter} onChange={(e) => setFilter(e.target.value)} options={[{ value: 'all', label: 'All students' }, { value: 'borrowed', label: 'Borrowed this year' }, { value: 'never', label: 'Never borrowed' }, { value: 'holding', label: 'Holding a book now' }]} />} flush>
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
