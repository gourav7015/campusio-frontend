import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { get, post } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, PageHeader, Select, useAction, fmtDate } from '../../components/ui.jsx';

/**
 * A class teacher moves their own class on to the next academic year. Classes do not all finish together (Class 12 may end in February while
 * Class 7 runs to March), so when their class's session is ending the teacher tells the office; once the office approves, they review the
 * students and move the class.
 */
const ACTIONS = [['promote', 'Move up to the next class'], ['retain', 'Repeat this class'], ['complete', 'Finished school']];
const TONE = { upcoming: '', active: 'green', promotion_in_progress: 'amber', completed: 'blue', archived: '' };

function ClassCard({ s, toYears, reload }) {
  const [toYear, setToYear] = useState(toYears[0]?.id || '');
  const [note, setNote] = useState('');
  const [plan, setPlan] = useState(null); const [items, setItems] = useState([]); const [done, setDone] = useState(null);
  const [run, busy] = useAction();
  const r = s.request;
  const ask = async () => { if (await run(() => post('/api/teacher/promotion/request', { sectionId: s.id, toYearId: toYear, note: note || undefined }), 'Sent to the office')) { setNote(''); reload(); } };
  const withdraw = async () => { if (await run(() => post(`/api/teacher/promotion/request/${r.id}/withdraw`, {}), 'Request withdrawn')) reload(); };
  const review = async () => { const x = await run(() => get('/api/teacher/promotion/preview', { sectionId: s.id, toYearId: r.toYearId })); if (x) { setPlan(x); setItems(x.items); setDone(null); } };
  const upd = (id, patch) => setItems((xs) => xs.map((i) => (i.enrolmentId === id ? { ...i, ...patch } : i)));
  const sectionsFor = (i) => plan.availableSections.filter((x) => (i.action === 'retain' ? x.className === i.fromClass : x.className === i.toClass));
  const problems = items.filter((i) => ['promote', 'retain'].includes(i.action) && !i.toSectionId).length;
  const commit = async () => {
    const x = await run(() => post('/api/teacher/promotion', { sectionId: s.id, toYearId: r.toYearId, confirm: true, items: items.map((i) => ({ enrolmentId: i.enrolmentId, action: i.action, ...(['promote', 'retain'].includes(i.action) ? { toSectionId: i.toSectionId } : {}) })) }), 'Class moved on');
    if (x) { setDone(x); setPlan(null); reload(); }
  };
  const para = (t) => <p className="muted" style={{ margin: 0 }}>{t}</p>;
  return (
    <Card title={s.name} action={<Badge tone={TONE[s.status]}>{s.statusLabel}</Badge>}>
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>Session {s.ended ? 'ended' : 'runs to'} {fmtDate(s.endDate, true)} · {s.waiting} {s.waiting === 1 ? 'student is' : 'students are'} waiting to be moved{s.moved ? `; ${s.moved} already moved` : ''}.</p>
        {done && <div className="alert ok">Done: {done.promoted} moved up, {done.retained} repeating, {done.completed} finished school.</div>}

        {!s.waiting && !r && para('Nobody is waiting in this class.')}
        {s.canAsk && (
          toYears.length
            ? <div className="stack-sm">
              <div className="row wrap" style={{ alignItems: 'end' }}>
                <Field label="Move them into"><Select aria-label="Next academic year" value={toYear} onChange={(e) => setToYear(e.target.value)} options={toYears.map((y) => ({ value: y.id, label: y.name }))} /></Field>
                <Field label="Note for the office (optional)"><Input aria-label="Note for the office" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. exams are over" /></Field>
                <Button variant="primary" loading={busy} disabled={!toYear} onClick={ask}>Session is ending: ask the office</Button>
              </div>
              <p className="small muted" style={{ margin: 0 }}>The office approves it first. Then you review the students and move the class. Nothing changes until you confirm.</p>
            </div>
            : para('The next academic year has not been set up yet. Ask the school office to create it, with its classes and sections.')
        )}
        {r?.status === 'rejected' && <div className="alert" role="status">The office did not approve the last request{r.decisionNote ? `: ${r.decisionNote}` : '.'} You can ask again when the class is ready.</div>}
        {r?.status === 'pending' && (
          <div className="row wrap" style={{ alignItems: 'center' }}>
            <Badge tone="amber">Waiting for the office</Badge><span className="muted">Sent {fmtDate(r.createdAt, true)}{r.note ? ` · “${r.note}”` : ''}</span>
            <Button size="sm" loading={busy} onClick={withdraw}>Withdraw</Button>
          </div>
        )}
        {s.canMove && !plan && (
          <div className="row wrap" style={{ alignItems: 'center' }}>
            <Badge tone="green">Approved{r.decidedByName ? ` by ${r.decidedByName}` : ''}</Badge>
            <Button variant="primary" loading={busy} onClick={review}>Review the students</Button>
          </div>
        )}
        {plan && (<>
          <DataTable searchable={false} pageSize={50} rows={items} rowKey="enrolmentId" columns={[
            { label: 'Student', render: (i) => <><b>{i.name}</b><div className="small muted">{i.admissionNo}</div></> },
            { label: 'What happens', render: (i) => <Select aria-label={`What happens to ${i.name}`} value={i.action} onChange={(e) => { const action = e.target.value; const match = plan.items.find((p) => p.enrolmentId === i.enrolmentId); upd(i.enrolmentId, { action, toSectionId: action === 'promote' ? match.toSectionId : undefined }); }} options={ACTIONS.map(([value, label]) => ({ value, label }))} /> },
            { label: 'Goes to', render: (i) => (['promote', 'retain'].includes(i.action) ? <Select aria-label={`Section for ${i.name}`} value={i.toSectionId || ''} onChange={(e) => upd(i.enrolmentId, { toSectionId: e.target.value })} placeholder="Choose section" options={sectionsFor(i).map((x) => ({ value: x.id, label: `${x.className} ${x.name} · ${x.planned}/${x.capacity}${x.classTeacher ? ` · class teacher ${x.classTeacher}` : ''}` }))} /> : <span className="muted">—</span>) },
            { label: '', render: (i) => i.warnings?.map((w) => <Badge key={w} tone="red">{w}</Badge>) },
          ]} />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <ConfirmButton variant="primary" disabled={problems > 0 || busy} message={`Move ${items.length} students of ${s.name} into the next year? The office can correct a mistake afterwards.`} onConfirm={commit}>Move the class on</ConfirmButton>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Students leaving the school (transfer or withdrawal) are handled by the office.</p>
        </>)}
      </div>
    </Card>
  );
}

export default function TeacherPromotion() {
  const q = useApi('/api/teacher/promotion');
  return (
    <Async state={q}>{(d) => (
      <div className="stack">
        <PageHeader title="Move my class on" subtitle={`When your class's session is ending, tell the office; once they approve, review its students and move the class into the next academic year. Now: ${d.year.name}.`} />
        {d.sections.length
          ? d.sections.map((s) => <ClassCard key={s.id} s={s} toYears={d.toYears} reload={q.reload} />)
          : <Empty title="You are not a class teacher this year">Only the class teacher of a class can move it to the next year.</Empty>}
      </div>
    )}</Async>
  );
}
