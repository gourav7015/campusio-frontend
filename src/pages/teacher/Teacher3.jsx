import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { post } from '../../api/client.js';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Tabs, useAction, fmtDate, label } from '../../components/ui.jsx';
import ChatView from '../../components/ChatView.jsx';
import { YourPeriods, DayGrid, DateStep, ModeNotice } from '../../components/PeriodAttendance.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useDialogs } from '../../design/ui';

const T = '/api/teacher';
const todayStr = () => new Date().toLocaleDateString('en-CA');
export const TeacherChats = () => <ChatView base={T} side="teacher" />;

// ───────────── remarks the family has to acknowledge ─────────────
export function TeacherRemarks() {
  const [pending, setPending] = useState(false);
  const q = useApi(`${T}/remarks`, { pending: pending || undefined }); const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Remarks and guidelines" subtitle="Everything you have sent to families, and who has acknowledged it. Families are reminded every day until they do. Add a remark from a student's page." />
      <Tabs tabs={[['all', 'Everything'], ['pending', 'Not acknowledged yet']]} value={pending ? 'pending' : 'all'} onChange={(t) => setPending(t === 'pending')} />
      <Card flush><Async skeleton="datatable" state={q} empty={<Empty title="Nothing here">Open a student from My classes to add a remark.</Empty>}>{(rows) => <DataTable rows={rows} empty="Nothing here" columns={[
        { label: 'Date', render: (r) => fmtDate(r.date, true) }, { label: 'Student', render: (r) => <Link to={`/teacher/students/${r.studentId}`}><b>{r.student}</b></Link> }, { label: 'Kind', render: (r) => label(r.category) }, { label: 'Message', key: 'text' },
        { label: 'Family', render: (r) => (!r.requireAck ? <span className="muted small">No reply needed</span> : r.acknowledged ? <Badge tone="green">Acknowledged</Badge> : <><Badge tone="amber">Not yet</Badge><div className="small muted">{r.reminders} reminder(s)</div></>) },
        { label: '', render: (r) => r.requireAck && !r.acknowledged && <Button size="sm" onClick={async () => { await run(() => post(`${T}/remarks/${r._id}/remind`), 'Reminder sent'); q.reload(); }}>Remind now</Button> }]} />}</Async></Card>
    </div>
  );
}

// ───────────── period swaps ─────────────
const tone = { pending: 'amber', approved: 'green', rejected: 'red', declined: 'red', cancelled: '' };
export function Swaps() {
  const [tab, setTab] = useState('swaps');
  const q = useApi(`${T}/swaps`); const ex = useApi(tab === 'closed' ? `${T}/attendance/exceptions` : null);
  const [modal, setModal] = useState(false); const dlg = useDialogs(); const [run] = useAction();
  const answer = async (s, accept) => { const note = accept ? undefined : await dlg.prompt('Tell them why (optional)', { title: 'Decline the swap' }); if (!accept && note === null) return; await run(() => post(`${T}/swaps/${s._id}/respond`, { accept, note: note || undefined }), accept ? 'Accepted. It now waits for the school admin.' : 'Declined'); q.reload(); };
  return (
    <div className="stack">
      <PageHeader title="Period swaps" subtitle="Need to change a period, for example because you will be on leave? Ask a colleague to take it, or swap with one of theirs. They agree first, then the school admin approves." actions={<Button variant="primary" onClick={() => setModal(true)}>+ Ask for a swap</Button>} />
      <Tabs tabs={[['swaps', 'Swaps'], ['closed', 'Attendance on closed days']]} value={tab} onChange={setTab} />
      {tab === 'swaps' && <Card flush><Async skeleton="datatable" state={q} empty={<Empty title="No swaps yet" />}>{(rows) => <DataTable rows={rows} empty="No swaps yet" columns={[
        { label: 'Date', render: (s) => fmtDate(s.date, true) },
        { label: 'Who', render: (s) => (s.mine ? <>You → <b>{s.toTeacher}</b></> : <><b>{s.fromTeacher}</b> → you</>) },
        { label: 'Period', render: (s) => <>{s.fromPeriod?.period} · {s.fromPeriod?.section} · {s.fromPeriod?.subject}<div className="small muted">{s.fromPeriod?.time}</div>{s.toPeriod && <div className="small muted">in return: {s.toPeriod.period} · {s.toPeriod.section} · {s.toPeriod.subject}</div>}</> },
        { label: 'Reason', key: 'reason' },
        { label: 'Status', render: (s) => <><Badge tone={tone[s.status]}>{label(s.status)}</Badge>{s.status === 'pending' && <div className="small muted">{s.peerStatus === 'accepted' ? 'Waiting for the school admin' : `Waiting for ${s.mine ? s.toTeacher : 'you'}`}</div>}{(s.peerNote || s.adminNote) && <div className="small muted">{s.adminNote || s.peerNote}</div>}</> },
        { label: '', render: (s) => s.status === 'pending' && (s.mine ? <ConfirmButton size="sm" message="Withdraw this request?" onConfirm={async () => { await run(() => post(`${T}/swaps/${s._id}/cancel`), 'Withdrawn'); q.reload(); }}>Withdraw</ConfirmButton> : s.peerStatus === 'pending' && <div className="row"><Button size="sm" variant="primary" onClick={() => answer(s, true)}>Accept</Button><Button size="sm" onClick={() => answer(s, false)}>Decline</Button></div>) }]} />}</Async></Card>}
      {tab === 'closed' && <Card flush title="Your requests to take attendance on a Sunday, a holiday or another closed day"><Async skeleton="datatable" state={ex} empty={<Empty title="No requests">Open Attendance, pick the day, and use “Ask the admin to allow it”.</Empty>}>{(rows) => <DataTable rows={rows} empty="No requests" columns={[{ label: 'Date', render: (e) => fmtDate(e.date, true) }, { label: 'Class', key: 'section' }, { label: 'Reason', key: 'reason' }, { label: 'Status', render: (e) => <><Badge tone={tone[e.status]}>{label(e.status)}</Badge>{e.decisionNote && <div className="small muted">{e.decisionNote}</div>}</> }, { label: '', render: (e) => e.status === 'approved' && <Link className="btn sm" to={`/teacher/attendance?sectionId=${e.sectionId}&date=${e.date}`}>Take attendance</Link> }]} />}</Async></Card>}
      {modal && <SwapModal onClose={() => setModal(false)} onDone={q.reload} />}
    </div>
  );
}

function SwapModal({ onClose, onDone }) {
  const [date, setDate] = useState(todayStr()); const [from, setFrom] = useState(''); const [other, setOther] = useState(''); const [back, setBack] = useState(''); const [reason, setReason] = useState('');
  const colleagues = useApi(`${T}/swaps/colleagues`);
  const mine = useApi(`${T}/swaps/periods`, { date });
  const theirs = useApi(other ? `${T}/swaps/periods` : null, { date, teacherId: other });
  const [run, busy] = useAction();
  const opt = (p) => ({ value: p.entryId, label: `${p.period} (${p.time}) · ${p.section} · ${p.subject || ''}` });
  return (
    <Modal wide title="Ask for a period swap" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!from || !other} onClick={async () => { const r = await run(() => post(`${T}/swaps`, { date, fromEntryId: from, toTeacherId: other, ...(back ? { toEntryId: back } : {}), ...(reason.trim() ? { reason: reason.trim() } : {}) }), 'Request sent'); if (r) { onDone(); onClose(); } }}>Send request</Button></>}>
      <div className="form-grid">
        <Field label="Date"><Input type="date" value={date} min={todayStr()} onChange={(e) => { setDate(e.target.value); setFrom(''); setBack(''); }} /></Field>
        <Field label="Your period to hand over"><Select value={from} onChange={(e) => setFrom(e.target.value)} placeholder={mine.data?.length ? 'Choose a period' : 'You have no periods that day'} options={(mine.data || []).map(opt)} /></Field>
        <Field label="Ask this teacher"><Select value={other} onChange={(e) => { setOther(e.target.value); setBack(''); }} placeholder="Choose a colleague" options={(colleagues.data || []).map((c) => ({ value: c._id, label: c.name }))} /></Field>
        <Field label="In return, you take one of theirs (optional)"><Select value={back} onChange={(e) => setBack(e.target.value)} placeholder="No, just cover mine" options={(theirs.data || []).map(opt)} /></Field>
        <Field label="Reason" full><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. I will be at a workshop" /></Field>
      </div>
      <p className="small muted">Your colleague must agree, and then the school admin approves. Until then nothing changes in the timetable.</p>
    </Modal>
  );
}

// ───────────── attendance period by period (when the school takes it that way) ─────────────
/** "Attendance" for every teacher in a school that takes it period by period: your lessons for the day, each marked by you. */
export function PeriodAttendance() {
  const [date, setDate] = useState(todayStr());
  const { user } = useAuth();
  return (
    <div className="stack">
      <PageHeader title="Attendance" subtitle="Mark who is in your class for each period you teach, including periods you are covering. A submitted period is locked, and the day is worked out from all the periods." actions={<DateStep value={date} max={todayStr()} onChange={setDate} />} />
      <ModeNotice change={user?.attendanceChange} />
      <Card flush><YourPeriods date={date} /></Card>
    </div>
  );
}

/**
 * "My class" in a school that takes attendance period by period: the class teacher sees the day as a grid of students against periods, who has marked
 * what, and the day that was worked out. There is no daily register. For a date before the change, the daily register is shown instead.
 */
export function ClassPeriods({ sectionId, children }) {
  const [date, setDate] = useState(todayStr());
  const { user } = useAuth();
  return (
    <div className="stack">
      <div className="row between wrap"><span className="muted small">Your school takes attendance period by period. Each teacher marks their own lessons; you mark yours.</span><Input type="date" aria-label="Date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} /></div>
      <ModeNotice change={user?.attendanceChange} />
      <DayGrid role="teacher" sectionId={sectionId} date={date} fallback={typeof children === 'function' ? children(date) : children} />
    </div>
  );
}
