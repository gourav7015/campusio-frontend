import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { post, put } from '../api/client.js';
import { Async, Badge, Button, Card, Input, Modal, Select, Stat, useAction, fmtDateTime, label, statusTone, Field } from './ui.jsx';

import { STATUSES, StatusControl, BulkMarkBar, statusText, SESSION_NAME } from './attendanceUi.jsx';

/** Daily attendance register: mark, review totals, save draft, submit; corrections need a reason. */
export default function RegisterEditor({ base, sectionId, date, onChange }) {
  const reg = useApi(sectionId && date ? `${base}/attendance/register` : null, { sectionId, date });
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState(''); const [filter, setFilter] = useState('');
  const [sel, setSel] = useState(new Set());
  const [fix, setFix] = useState(null);
  const [ask, setAsk] = useState(false);
  const [reg8, setReg8] = useState(null); // a student whose absent/late mark the class teacher is regularising
  const [open, setOpen] = useState(false); // asking for attendance on a closed day
  const [note8, setNote8] = useState('');
  const isTeacher = base === '/api/teacher';
  const [weekAgo] = useState(() => new Date(Date.now() - 7 * 864e5).toLocaleDateString('en-CA'));
  const withinWeek = date >= weekAgo;
  const [run, busy] = useAction();
  const resetKey = `${sectionId}|${date}|${reg.data?.session?.status}`;
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) { setSeenKey(resetKey); setRows(null); setSel(new Set()); }
  const d = reg.data;
  const list = rows || d?.students || [];
  const entries = () => list.filter((s) => s.status).map((s) => ({ studentId: s.studentId, status: s.status, ...(s.status === 'half_day' ? { halfSession: s.halfSession || 'first' } : {}), remarks: s.remarks || undefined }));
  const set = (ids, status, halfSession = null) => setRows(list.map((s) => (ids.has(s.studentId) ? { ...s, status, halfSession: status === 'half_day' ? halfSession || 'first' : null } : s)));
  const totals = useMemo(() => { const t = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0, unmarked: 0 }; list.forEach((s) => { if (s.status) t[s.status === 'excused' ? 'leave' : s.status]++; else t.unmarked++; }); return t; }, [list]);
  const shown = list.filter((s) => (!q || `${s.name} ${s.rollNo}`.toLowerCase().includes(q.toLowerCase())) && (!filter || (filter === 'unmarked' ? !s.status : s.status === filter)));
  if (!sectionId) return null;
  return (
    <Async state={reg}>{() => (
      <div className="stack">
        {d.blocked && <div className="alert info row between wrap"><span>Attendance can't be taken for this date: {d.blocked.startsWith('holiday') ? `holiday — ${d.blocked.split(':')[1]}` : d.blocked === 'future' ? 'it is in the future' : 'not a working day'}.{d.blocked !== 'future' && ' If the school is open for a test, exam or duty, attendance can be allowed for this day.'}</span>
          {d.blocked !== 'future' && (isTeacher ? d.isClassTeacher : true) && <Button size="sm" onClick={() => setOpen(true)}>{isTeacher ? 'Ask the admin to allow it' : 'Allow attendance on this day'}</Button>}</div>}
        {d.specialDay && <div className="alert ok">The school admin has allowed attendance on this day.</div>}
        {d.session?.status === 'submitted' && (isTeacher && d.canEdit
          ? <div className="alert ok">Register submitted {fmtDateTime(d.session.submittedAt)}. You can still change it: each change is kept in the record and the student is told.</div>
          : <div className="alert ok row between"><span>Register submitted {fmtDateTime(d.session.submittedAt)}. It is now locked — only the school admin can correct it.</span>{d.isClassTeacher && <Button size="sm" onClick={() => setAsk(true)}>Request correction</Button>}</div>)}
        {!d.isClassTeacher && <div className="alert info">You teach in this section but are not its class teacher, so you can view attendance but not take it.</div>}
        <div className="grid g4"><Stat value={d.students.length} label="Students" /><Stat value={totals.present + totals.late + totals.half_day} label="Present" tone="green" sub={`${totals.late} late, ${totals.half_day} half day`} /><Stat value={totals.absent} label="Absent" tone="red" /><Stat value={totals.unmarked} label="Not marked" tone={totals.unmarked ? 'amber' : undefined} sub={`${totals.leave} on leave`} /></div>
        <Card flush>
          <div className="card-b row wrap">
            <div className="grow"><Input placeholder="Search student or roll" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search student" /></div>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="All statuses" options={[...STATUSES, 'unmarked'].map((s) => ({ value: s, label: label(s) }))} aria-label="Filter status" />
            {d.canEdit && <><BulkMarkBar onAll={(st) => set(new Set(list.map((s) => s.studentId)), st)} />
              <Button disabled={!sel.size} onClick={() => { set(sel, 'absent'); setSel(new Set()); }}>Mark selected absent</Button><Button disabled={!sel.size} onClick={() => { set(sel, 'leave'); setSel(new Set()); }}>Mark selected leave</Button></>}
          </div>
          <div className="table-wrap"><table><thead><tr>{d.canEdit && <th />}<th>Roll</th><th>Student</th><th>Status</th><th>Remarks</th></tr></thead><tbody>{shown.map((s) => (
            <tr key={s.studentId}>{d.canEdit && <td><input type="checkbox" aria-label={`Select ${s.name}`} checked={sel.has(s.studentId)} onChange={(e) => { const n = new Set(sel); e.target.checked ? n.add(s.studentId) : n.delete(s.studentId); setSel(n); }} /></td>}
              <td>{String(s.rollNo).padStart(2, '0')}</td><td><b>{s.name}</b> {s.monitor && <Badge tone="blue">Monitor</Badge>} {s.regularised ? <Badge tone="green">regularised</Badge> : s.corrected && <Badge tone="amber">corrected</Badge>}</td>
              <td>{d.canEdit ? <StatusControl name={s.name} status={s.status} halfSession={s.halfSession} onChange={(st, hs) => set(new Set([s.studentId]), st, hs)} />
                : <div className="row"><Badge tone={statusTone(s.status)}>{statusText(s.status, s.halfSession)}</Badge>{d.canCorrect && <Button size="sm" onClick={() => setFix(s)}>Correct</Button>}{isTeacher && d.isClassTeacher && withinWeek && d.session?.status === 'submitted' && ['absent', 'late'].includes(s.status) && <Button size="sm" onClick={() => setReg8(s)}>Regularise</Button>}</div>}</td>
              <td>{d.canEdit ? <Input value={s.remarks || ''} placeholder="Remark" onChange={(e) => setRows(list.map((x) => (x.studentId === s.studentId ? { ...x, remarks: e.target.value } : x)))} /> : <span className="muted small">{s.remarks}</span>}</td></tr>))}</tbody></table></div>
          {d.canEdit && <div className="card-b row" style={{ justifyContent: 'flex-end' }}>
            {d.session?.status === 'submitted'
              ? <Button variant="primary" loading={busy} onClick={async () => { const r = await run(() => post(`${base}/attendance/register/submit`, { sectionId, date, entries: entries() }), (x) => (x.changed ? `Saved: ${x.changed} change(s)` : 'Nothing was changed')); if (r) { setRows(null); reg.reload(); onChange?.(); } }}>Save changes</Button>
              : <>
            <Button loading={busy} onClick={async () => { await run(() => put(`${base}/attendance/register`, { sectionId, date, entries: entries() }), 'Draft saved'); reg.reload(); onChange?.(); }}>Save draft</Button>
            <Button variant="primary" loading={busy} disabled={!list.length} onClick={async () => { if (totals.unmarked) { alert(`${totals.unmarked} student(s) are not marked yet.`); return; } const r = await run(() => post(`${base}/attendance/register/submit`, { sectionId, date, entries: entries() }), (x) => `Submitted: ${x.totals.present} present, ${x.totals.absent} absent, ${x.totals.late} late, ${x.totals.leave} leave`); if (r) { reg.reload(); onChange?.(); } }}>Submit attendance</Button></>}</div>}
        </Card>
        {reg8 && <Modal title={`Regularise · ${reg8.name}`} onClose={() => setReg8(null)} footer={<><Button onClick={() => setReg8(null)}>Cancel</Button><Button variant="primary" disabled={reg8.reason?.trim().length < 3 || !reg8.reason} loading={busy} onClick={async () => { const r = await run(() => post(`${base}/attendance/regularise`, { sectionId, date, studentId: reg8.studentId, reason: reg8.reason }), 'Regularised: marked present'); if (r) { setReg8(null); reg.reload(); onChange?.(); } }}>Mark present</Button></>}>
          <div className="stack"><div>This day is marked <Badge tone={statusTone(reg8.status)}>{label(reg8.status)}</Badge>. Regularising turns it into present and keeps the original status, your name and the reason in the record. You can do this for a week; after that the school admin corrects it.</div>
            <Field label="Reason (required)"><Input autoFocus value={reg8.reason || ''} onChange={(e) => setReg8({ ...reg8, reason: e.target.value })} placeholder="e.g. Came after the bell; the school bus was late" /></Field></div></Modal>}
        {open && <Modal title={isTeacher ? 'Ask to take attendance on this day' : 'Allow attendance on this day'} onClose={() => setOpen(false)} footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" disabled={(note8 || '').trim().length < 3} loading={busy} onClick={async () => { const r = await run(() => post(isTeacher ? `${base}/attendance/exceptions` : `${base}/attendance-exceptions`, { sectionId, date, reason: note8 }), isTeacher ? 'Request sent to the school admin' : 'Attendance allowed for this day'); if (r) { setOpen(false); reg.reload(); } }}>{isTeacher ? 'Send request' : 'Allow'}</Button></>}>
          <Field label="Why is attendance needed on this day?" hint={isTeacher ? 'For example a Sunday exam, a talent test or correction duty. The school admin approves it.' : 'It is recorded with your name.'}><Input autoFocus value={note8 || ''} onChange={(e) => setNote8(e.target.value)} /></Field></Modal>}
        {ask && <RequestModal onClose={() => setAsk(false)} onSend={async (note) => { const r = await run(() => post(`${base}/attendance/request-correction`, { sectionId, date, note }), 'Request sent to the school admin'); if (r) setAsk(false); }} />}
        {fix && <CorrectModal student={fix} onClose={() => setFix(null)} onSave={async (status, reason, halfSession) => { const r = await run(() => post(`${base}/attendance/correct`, { sectionId, date, studentId: fix.studentId, status, ...(status === 'half_day' ? { halfSession } : {}), reason }), 'Correction recorded'); if (r) { setFix(null); reg.reload(); onChange?.(); } }} />}
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
  const [status, setStatus] = useState(''); const [reason, setReason] = useState(''); const [part, setPart] = useState(student.halfSession || 'first');
  return (
    <Modal title={`Correct attendance · ${student.name}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!status || reason.trim().length < 3} onClick={() => onSave(status, reason, part)}>Save correction</Button></>}>
      <div className="stack"><div>Current status: <Badge tone={statusTone(student.status)}>{statusText(student.status, student.halfSession)}</Badge></div>
        <Field label="New status"><Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Select" options={['present', 'absent', 'late', 'half_day', 'leave', 'excused'].filter((s) => s !== student.status || s === 'half_day').map((s) => ({ value: s, label: label(s) }))} /></Field>
        {status === 'half_day' && <Field label="Session attended"><Select aria-label="Session attended" value={part} onChange={(e) => setPart(e.target.value)} options={Object.entries(SESSION_NAME).map(([value, l]) => ({ value, label: l }))} /></Field>}
        <Field label="Reason (required)" hint="The original status, the new status, your name and this reason are kept in the record."><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field></div>
    </Modal>
  );
}
