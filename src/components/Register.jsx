import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { post, put } from '../api/client.js';
import { Async, Badge, Button, Card, Input, Modal, Select, Stat, useAction, fmtDateTime, label, statusTone, Field } from './ui.jsx';

const STATUSES = ['present', 'absent', 'late', 'leave'];

/** Daily attendance register: mark, review totals, save draft, submit; corrections need a reason. */
export default function RegisterEditor({ base, sectionId, date, onChange }) {
  const reg = useApi(sectionId && date ? `${base}/attendance/register` : null, { sectionId, date });
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState(''); const [filter, setFilter] = useState('');
  const [sel, setSel] = useState(new Set());
  const [fix, setFix] = useState(null);
  const [ask, setAsk] = useState(false);
  const [run, busy] = useAction();
  const resetKey = `${sectionId}|${date}|${reg.data?.session?.status}`;
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) { setSeenKey(resetKey); setRows(null); setSel(new Set()); }
  const d = reg.data;
  const list = rows || d?.students || [];
  const entries = () => list.filter((s) => s.status).map((s) => ({ studentId: s.studentId, status: s.status, remarks: s.remarks || undefined }));
  const set = (ids, status) => setRows(list.map((s) => (ids.has(s.studentId) ? { ...s, status } : s)));
  const totals = useMemo(() => { const t = { present: 0, absent: 0, late: 0, leave: 0, unmarked: 0 }; list.forEach((s) => { if (s.status) t[s.status === 'excused' ? 'leave' : s.status]++; else t.unmarked++; }); return t; }, [list]);
  const shown = list.filter((s) => (!q || `${s.name} ${s.rollNo}`.toLowerCase().includes(q.toLowerCase())) && (!filter || (filter === 'unmarked' ? !s.status : s.status === filter)));
  if (!sectionId) return null;
  return (
    <Async state={reg}>{() => (
      <div className="stack">
        {d.blocked && <div className="alert info">Attendance can't be taken for this date: {d.blocked.startsWith('holiday') ? `holiday — ${d.blocked.split(':')[1]}` : d.blocked === 'future' ? 'it is in the future' : 'not a working day'}.</div>}
        {d.session?.status === 'submitted' && <div className="alert ok row between"><span>Register submitted {fmtDateTime(d.session.submittedAt)}. It is now locked — only the school admin can correct it.</span>{d.isClassTeacher && <Button size="sm" onClick={() => setAsk(true)}>Request correction</Button>}</div>}
        {!d.isClassTeacher && <div className="alert info">You teach in this section but are not its class teacher, so you can view attendance but not take it.</div>}
        <div className="grid g4"><Stat value={d.students.length} label="Students" /><Stat value={totals.present + totals.late} label="Present" tone="green" sub={`${totals.late} late`} /><Stat value={totals.absent} label="Absent" tone="red" /><Stat value={totals.unmarked} label="Not marked" tone={totals.unmarked ? 'amber' : undefined} sub={`${totals.leave} on leave`} /></div>
        <Card flush>
          <div className="card-b row wrap">
            <div className="grow"><Input placeholder="Search student or roll" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search student" /></div>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="All statuses" options={[...STATUSES, 'unmarked'].map((s) => ({ value: s, label: label(s) }))} aria-label="Filter status" />
            {d.canEdit && <><Button onClick={() => set(new Set(list.map((s) => s.studentId)), 'present')}>Mark all present</Button>
              <Button disabled={!sel.size} onClick={() => { set(sel, 'absent'); setSel(new Set()); }}>Mark selected absent</Button><Button disabled={!sel.size} onClick={() => { set(sel, 'leave'); setSel(new Set()); }}>Mark selected leave</Button></>}
          </div>
          <div className="table-wrap"><table><thead><tr>{d.canEdit && <th />}<th>Roll</th><th>Student</th><th>Status</th><th>Remarks</th></tr></thead><tbody>{shown.map((s) => (
            <tr key={s.studentId}>{d.canEdit && <td><input type="checkbox" aria-label={`Select ${s.name}`} checked={sel.has(s.studentId)} onChange={(e) => { const n = new Set(sel); e.target.checked ? n.add(s.studentId) : n.delete(s.studentId); setSel(n); }} /></td>}
              <td>{String(s.rollNo).padStart(2, '0')}</td><td><b>{s.name}</b> {s.corrected && <Badge tone="amber">corrected</Badge>}</td>
              <td>{d.canEdit ? <div className="status-seg" role="group" aria-label={`Status for ${s.name}`}>{STATUSES.map((st) => <button key={st} className={`${s.status === st ? 'on' : ''} ${st}`} onClick={() => set(new Set([s.studentId]), st)} aria-pressed={s.status === st}>{label(st)}</button>)}</div>
                : <div className="row"><Badge tone={statusTone(s.status)}>{label(s.status) || 'Not marked'}</Badge>{d.canCorrect && <Button size="sm" onClick={() => setFix(s)}>Correct</Button>}</div>}</td>
              <td>{d.canEdit ? <Input value={s.remarks || ''} placeholder="Remark" onChange={(e) => setRows(list.map((x) => (x.studentId === s.studentId ? { ...x, remarks: e.target.value } : x)))} /> : <span className="muted small">{s.remarks}</span>}</td></tr>))}</tbody></table></div>
          {d.canEdit && <div className="card-b row" style={{ justifyContent: 'flex-end' }}>
            <Button loading={busy} onClick={async () => { await run(() => put(`${base}/attendance/register`, { sectionId, date, entries: entries() }), 'Draft saved'); reg.reload(); onChange?.(); }}>Save draft</Button>
            <Button variant="primary" loading={busy} disabled={!list.length} onClick={async () => { if (totals.unmarked) { alert(`${totals.unmarked} student(s) are not marked yet.`); return; } const r = await run(() => post(`${base}/attendance/register/submit`, { sectionId, date, entries: entries() }), (x) => `Submitted: ${x.totals.present} present, ${x.totals.absent} absent, ${x.totals.late} late, ${x.totals.leave} leave`); if (r) { reg.reload(); onChange?.(); } }}>Submit attendance</Button></div>}
        </Card>
        {ask && <RequestModal onClose={() => setAsk(false)} onSend={async (note) => { const r = await run(() => post(`${base}/attendance/request-correction`, { sectionId, date, note }), 'Request sent to the school admin'); if (r) setAsk(false); }} />}
        {fix && <CorrectModal student={fix} onClose={() => setFix(null)} onSave={async (status, reason) => { const r = await run(() => post(`${base}/attendance/correct`, { sectionId, date, studentId: fix.studentId, status, reason }), 'Correction recorded'); if (r) { setFix(null); reg.reload(); onChange?.(); } }} />}
      </div>)}</Async>
  );
}

function RequestModal({ onClose, onSend }) {
  const [note, setNote] = useState('');
  return (
    <Modal title="Request an attendance correction" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={note.trim().length < 5} onClick={() => onSend(note)}>Send to admin</Button></>}>
      <Field label="What needs to change, and why?" hint="The school admin will review and correct it; the change is recorded with a reason."><Input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Aarav was present, marked absent by mistake" /></Field>
    </Modal>
  );
}

function CorrectModal({ student, onClose, onSave }) {
  const [status, setStatus] = useState(''); const [reason, setReason] = useState('');
  return (
    <Modal title={`Correct attendance · ${student.name}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!status || reason.trim().length < 3} onClick={() => onSave(status, reason)}>Save correction</Button></>}>
      <div className="stack"><div>Current status: <Badge tone={statusTone(student.status)}>{label(student.status)}</Badge></div>
        <Field label="New status"><Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Select" options={['present', 'absent', 'late', 'leave', 'excused'].filter((s) => s !== student.status).map((s) => ({ value: s, label: label(s) }))} /></Field>
        <Field label="Reason (required)" hint="The original status, the new status, your name and this reason are kept in the record."><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field></div>
    </Modal>
  );
}
