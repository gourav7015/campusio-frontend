import { useMemo, useState } from 'react';
import { leaveFields, leavePayload, daysText, leaveStatus } from '../../components/leaveForm.js';
import { useApi } from '../../hooks/useApi.js';
import { useLookups } from '../../hooks/useLookups.js';
import { post, patch, del, download } from '../../api/client.js';
import { Download } from 'lucide-react';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Tabs, useAction, statusTone, fmtDate, dayName, label } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import RegisterEditor from '../../components/Register.jsx';

const today = () => new Date().toLocaleDateString('en-CA');

// ───────────── Timetable ─────────────
export function Timetable() {
  const L = useLookups();
  const [tab, setTab] = useState('grid');
  const [sectionId, setSectionId] = useState('');
  const sid = sectionId || L.sections.find((s) => s.status === 'active')?._id || '';
  const periods = useApi('/api/school/timetable/periods');
  const entries = useApi(sid ? '/api/school/timetable/entries' : null, { sectionId: sid });
  const asg = useApi(sid ? '/api/school/teaching-assignments' : null, { sectionId: sid, open: 'true' });
  const unresolved = useApi('/api/school/timetable/unresolved');
  const subs = useApi('/api/school/substitutions');
  const [modal, setModal] = useState(null); const [save2, setSave2] = useState(false);
  const [run] = useAction();
  const section = L.sections.find((s) => s._id === sid);
  const lessons = (periods.data || []).filter((p) => p.type === 'lesson');
  const byKey = useMemo(() => new Map((entries.data || []).map((e) => [`${e.day}-${e.periodId}`, e])), [entries.data]);
  const days = [1, 2, 3, 4, 5, 6];
  const reloadAll = () => { entries.reload(); unresolved.reload(); };
  const save = async (v) => {
    const r = await post('/api/school/timetable/entries', { sectionId: sid, day: modal.day, periodId: modal.periodId, assignmentId: v.assignmentId, room: v.room });
    reloadAll(); return r.warnings?.length ? alert(r.warnings.join('\n')) || true : true;
  };
  return (
    <div className="stack">
      <PageHeader title="Timetable" subtitle="Teacher, room and section conflicts are checked automatically" actions={<><Select value={sid} onChange={(e) => setSectionId(e.target.value)} options={L.sectionOptions} aria-label="Section" /><Button onClick={() => setSave2(true)} aria-label="Download timetable" title="Download timetable"><Download size={16} aria-hidden /> Download</Button></>} />
      {unresolved.data?.length > 0 && <div className="alert">{unresolved.data.length} period(s) have no teacher because an assignment ended: {unresolved.data.slice(0, 4).map((u) => `${u.section} ${u.period} (${u.subject})`).join(', ')}. Click the period in the grid to assign a teacher.</div>}
      <Tabs tabs={[['grid', 'Weekly grid'], ['periods', 'Period timings'], ['subs', 'Substitutions']]} value={tab} onChange={setTab} />
      {tab === 'grid' && (
        <Card flush>{!lessons.length ? <Empty title="Define period timings first" /> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Period</th>{days.map((d) => <th key={d}>{dayName(d)}</th>)}</tr></thead>
            <tbody>{(periods.data || []).map((p) => p.type === 'break'
              ? <tr key={p._id}><td colSpan={7} className="center muted small">{p.name} · {p.startTime}–{p.endTime}</td></tr>
              : <tr key={p._id}><td className="nw"><b>{p.name}</b><div className="small muted">{p.startTime}–{p.endTime}</div></td>{days.map((d) => {
                const e = byKey.get(`${d}-${p._id}`);
                return <td key={d}><button className="btn sm" style={{ width: '100%', minHeight: 46, textAlign: 'left', borderColor: e?.unresolved ? 'var(--red)' : undefined }} onClick={() => setModal({ day: d, periodId: p._id, entry: e })} disabled={!sid}>
                  {e ? <><b>{e.subjectCode || e.subject}</b><div className="small muted">{e.teacher}{e.room ? ` · ${e.room}` : ''}</div></> : <span className="muted">+</span>}</button></td>;
              })}</tr>)}</tbody></table></div>)}</Card>)}
      {tab === 'periods' && <PeriodsEditor periods={periods} />}
      {tab === 'subs' && (<div className="stack">
        <div><Button variant="primary" onClick={() => setModal({ sub: true })}>+ Arrange substitute</Button></div>
        <Card flush><Async state={subs} empty={<div className="empty">No substitutions arranged</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Date', render: (s) => fmtDate(s.date, true) }, { label: 'Original teacher', render: (s) => s.originalTeacherId?.name }, { label: 'Substitute', render: (s) => <b>{s.substituteTeacherId?.name}</b> }, { label: 'Reason', key: 'reason' },
          { label: '', render: (s) => <ConfirmButton size="sm" message="Remove this substitution?" onConfirm={async () => { await run(() => del(`/api/school/substitutions/${s._id}`), 'Removed'); subs.reload(); }}>Remove</ConfirmButton> }]} />}</Async></Card></div>)}
      {modal?.periodId && <FormModal title={`${dayName(modal.day)} · ${(periods.data || []).find((p) => p._id === modal.periodId)?.name}${section ? ` · ${L.sectionName(sid)}` : ''}`}
        initial={{ assignmentId: modal.entry?.assignmentId, room: modal.entry?.room }} submitLabel="Save period"
        fields={[{ name: 'assignmentId', label: 'Subject & teacher', type: 'select', required: true, options: (asg.data || []).map((a) => ({ value: a._id, label: `${a.subjectId?.name} — ${a.teacherId?.name}` })) }, { name: 'room', label: 'Room', hint: 'Defaults to the section room' }]}
        onClose={() => setModal(null)} onSubmit={save}>
        {modal.entry && <div style={{ marginTop: 12 }}><ConfirmButton variant="danger" size="sm" message="Remove this period?" onConfirm={async () => { await run(() => del(`/api/school/timetable/entries/${modal.entry._id}`), 'Removed'); setModal(null); reloadAll(); }}>Remove period</ConfirmButton></div>}</FormModal>}
      {modal?.sub && <SubstituteModal L={L} onClose={() => setModal(null)} onDone={() => { setModal(null); subs.reload(); }} />}
      {save2 && <TimetableDownload L={L} current={section} onClose={() => setSave2(false)} />}
    </div>
  );
}

function PeriodsEditor({ periods }) {
  const [modal, setModal] = useState(null); const [run] = useAction();
  return (
    <div className="stack">
      <div><Button variant="primary" onClick={() => setModal({})}>+ Add period or break</Button></div>
      <Card flush><Async state={periods} empty={<div className="empty">No periods yet</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: '#', key: 'order' }, { label: 'Name', render: (p) => <b>{p.name}</b> }, { label: 'Time', render: (p) => `${p.startTime} – ${p.endTime}` }, { label: 'Type', render: (p) => <Badge tone={p.type === 'break' ? 'amber' : 'blue'}>{p.type}</Badge> },
        { label: '', render: (p) => <div className="row"><Button size="sm" onClick={() => setModal(p)}>Edit</Button><ConfirmButton size="sm" variant="danger" message="Delete this period?" onConfirm={async () => { await run(() => del(`/api/school/timetable/periods/${p._id}`), 'Deleted'); periods.reload(); }}>Delete</ConfirmButton></div> }]} />}</Async></Card>
      {modal && <FormModal title={modal._id ? 'Edit period' : 'Add period'} initial={modal} fields={[{ name: 'name', label: 'Name', required: true, placeholder: 'Period 1' }, { name: 'order', label: 'Order', type: 'number', required: true, min: 1 }, { name: 'startTime', label: 'Starts', type: 'time', required: true }, { name: 'endTime', label: 'Ends', type: 'time', required: true }, { name: 'type', label: 'Type', type: 'select', options: ['lesson', 'break'], default: 'lesson', required: true }]}
        onClose={() => setModal(null)} onSubmit={async (v) => { await (modal._id ? patch(`/api/school/timetable/periods/${modal._id}`, v) : post('/api/school/timetable/periods', v)); periods.reload(); return true; }} />}
    </div>
  );
}

function SubstituteModal({ L, onClose, onDone }) {
  const [teacherId, setTeacherId] = useState(''); const [date, setDate] = useState(today());
  const [run, busy] = useAction();
  const [sub, setSub] = useState(''); const [reason, setReason] = useState('');
  const entries = useApi(teacherId ? '/api/school/timetable/entries' : null, { teacherId });
  const [entryId, setEntryId] = useState('');
  const dow = new Date(`${date}T00:00:00`).getDay() || 7;
  const candidates = (entries.data || []).filter((e) => e.day === dow);
  return (
    <Modal title="Arrange a substitute" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!entryId || !sub} onClick={async () => { const ok = await run(() => post('/api/school/substitutions', { entryId, date, substituteTeacherId: sub, reason: reason || undefined }), 'Substitute arranged'); if (ok) onDone(); }}>Save</Button></>}>
      <div className="stack">
        <Field label="Absent teacher"><Select value={teacherId} onChange={(e) => { setTeacherId(e.target.value); setEntryId(''); }} options={L.teacherOptions} placeholder="Select teacher" /></Field>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setEntryId(''); }} /></Field>
        <Field label="Period to cover" hint={teacherId && !candidates.length ? 'This teacher has no periods on that weekday' : undefined}><Select value={entryId} onChange={(e) => setEntryId(e.target.value)} placeholder="Select period" options={candidates.map((e) => ({ value: e._id, label: `${L.sectionName(e.sectionId)} · ${e.subject}` }))} /></Field>
        <Field label="Substitute teacher"><Select value={sub} onChange={(e) => setSub(e.target.value)} options={L.teacherOptions.filter((t) => t.value !== teacherId)} placeholder="Select teacher" /></Field>
        <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/** A section's register in a window, with the same controls the class teacher has (mark all present or absent, half day with its session, remarks, corrections with a reason). */
/**
 * Download the timetable. Choose what to print with the filters: every section, one class, or one section; as a PDF (a page per section) or a CSV.
 * It starts on the section that is open, so one tap prints what you are looking at.
 */
function TimetableDownload({ L, current, onClose }) {
  const [f, setF] = useState({ classId: current?.classId || '', sectionId: current?._id || '', format: 'pdf' });
  const [run, busy] = useAction();
  const secs = L.sections.filter((x) => x.yearId === L.currentYear?._id && x.status === 'active' && (!f.classId || x.classId === f.classId));
  const cls = L.classes.find((c) => c._id === f.classId); const sec = secs.find((x) => x._id === f.sectionId);
  const what = f.sectionId ? `${cls?.name || ''} ${sec?.name || ''}`.trim() : f.classId ? `all of ${cls?.name}` : 'every section';
  const name = f.sectionId ? `timetable-${`${cls?.name}-${sec?.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : f.classId ? `timetable-${cls?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : 'timetable-all-sections';
  return (
    <Modal title="Download timetable" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={async () => { await run(() => download('/api/school/timetable/export', `${name}.${f.format}`, { format: f.format, ...(f.sectionId ? { sectionId: f.sectionId } : f.classId ? { classId: f.classId } : {}) }), 'Timetable downloaded'); onClose(); }}>Download {f.format.toUpperCase()}</Button></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label="Class"><Select aria-label="Class" value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value, sectionId: '' })} placeholder="All classes" options={L.classes.filter((c) => c.status === 'active').map((c) => ({ value: c._id, label: c.name }))} /></Field>
          <Field label="Section"><Select aria-label="Section to download" value={f.sectionId} onChange={(e) => setF({ ...f, sectionId: e.target.value })} placeholder="All sections" options={secs.map((x) => ({ value: x._id, label: `${L.classes.find((c) => c._id === x.classId)?.name || ''} ${x.name}`.trim() }))} /></Field>
          <Field label="Format"><Select aria-label="Format" value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })} options={[{ value: 'pdf', label: 'PDF (a page per section, ready to print)' }, { value: 'csv', label: 'CSV (one row per lesson, opens in Excel)' }]} /></Field>
        </div>
        <p className="small muted">You will get the timetable of <b>{what}</b> for the current session.</p>
      </div>
    </Modal>
  );
}

export function RegisterModal({ sectionId, title, date, onClose }) {
  return (
    <Modal wide title={`${title} · ${fmtDate(date, true)}`} onClose={onClose}>
      <RegisterEditor base="/api/school" sectionId={sectionId} date={date} />
    </Modal>
  );
}

// ───────────── Homework & materials (read + moderation) ─────────────
export function Learning() {
  const [tab, setTab] = useState('homework');
  const hw = useApi('/api/school/homework');
  const mat = useApi('/api/school/materials');
  const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Homework & study materials" subtitle="Teachers publish these for their own classes. You can review, edit or archive anything." />
      <Tabs tabs={[['homework', 'Homework'], ['materials', 'Study materials']]} value={tab} onChange={setTab} />
      {tab === 'homework' ? <Card flush><Async state={hw} empty={<div className="empty">No homework yet</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Title', render: (h) => <b>{h.title}</b> }, { label: 'Class', render: (h) => `${h.className} ${h.section}` }, { label: 'Subject', key: 'subject' }, { label: 'Teacher', key: 'teacher' }, { label: 'Due', render: (h) => fmtDate(h.dueDate) }, { label: 'Status', render: (h) => <Badge tone={statusTone(h.effectiveStatus)}>{label(h.effectiveStatus)}</Badge> },
        { label: '', render: (h) => h.effectiveStatus !== 'archived' && <ConfirmButton size="sm" message="Archive this homework?" onConfirm={async () => { await run(() => post(`/api/school/homework/${h._id}/archive`), 'Archived'); hw.reload(); }}>Archive</ConfirmButton> }]} />}</Async></Card>
        : <Card flush><Async state={mat} empty={<div className="empty">No materials yet</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Title', render: (m) => <b>{m.title}</b> }, { label: 'Class', render: (m) => `${m.className} ${m.section}` }, { label: 'Subject', key: 'subject' }, { label: 'Chapter', key: 'chapter' }, { label: 'Type', key: 'materialType' }, { label: 'Teacher', key: 'teacher' }, { label: 'Status', render: (m) => <Badge tone={statusTone(m.status)}>{label(m.status)}</Badge> },
          { label: '', render: (m) => m.status === 'published' && <Button size="sm" onClick={async () => { await run(() => post(`/api/school/materials/${m._id}/unpublish`), 'Unpublished'); mat.reload(); }}>Unpublish</Button> }]} />}</Async></Card>}
    </div>
  );
}

// ───────────── Teacher leave ─────────────
export function LeaveAdmin({ embedded = false }) {
  const [status, setStatus] = useState('submitted');
  const list = useApi('/api/school/leave', { status });
  const L = useLookups();
  const [view, setView] = useState(null); const [editing, setEditing] = useState(null);
  const [run, busy] = useAction();
  return (
    <div className="stack">
      {(() => { const pick = <Select value={status} onChange={(e) => setStatus(e.target.value)} options={['submitted', 'approved', 'rejected', 'cancelled'].map((s) => ({ value: s, label: leaveStatus(s) }))} aria-label="Status" />;
        return embedded ? <div className="row between"><p className="muted small" style={{ margin: 0 }}>Approve or reject leave and arrange substitutes for the periods that are missed.</p>{pick}</div>
          : <PageHeader title="Teacher leave" subtitle="Approve or reject leave and arrange substitutes for the periods that are missed" actions={pick} />; })()}
      <Card flush><Async state={list} empty={<div className="empty">No applications</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Teacher', render: (l) => <b>{l.teacherId?.name}</b> }, { label: 'Type', key: 'leaveType' }, { label: 'From', render: (l) => fmtDate(l.startDate, true) }, { label: 'To', render: (l) => fmtDate(l.endDate, true) }, { label: 'Days', render: daysText }, { label: 'Reason', key: 'reason' }, { label: 'Status', render: (l) => <Badge tone={statusTone(l.status)}>{leaveStatus(l.status)}</Badge> }, { label: '', render: (l) => <div className="row"><Button size="sm" onClick={() => setView(l)}>Review</Button>{l.status !== 'cancelled' && <Button size="sm" onClick={() => setEditing(l)}>Edit</Button>}</div> }]} />}</Async></Card>
      {editing && <FormModal title={`Edit leave · ${editing.teacherId?.name}`} initial={editing} submitLabel="Save changes" fields={leaveFields({ startLabel: 'From', endLabel: 'To', after: [{ name: 'editNote', label: 'Note to the teacher (optional)', full: true }] })} onClose={() => setEditing(null)} onSubmit={async (v) => { await patch(`/api/school/leave/${editing._id}`, leavePayload(v)); list.reload(); return true; }}><p className="small muted" style={{ marginTop: 10 }}>The days are counted again from the working days in the new dates, and the teacher is told what changed.</p></FormModal>}
      {view && <LeaveReview leave={view} L={L} onClose={() => { setView(null); list.reload(); }} run={run} busy={busy} />}
    </div>
  );
}

function LeaveReview({ leave, L, onClose, run, busy }) {
  const affected = useApi(`/api/school/leave/${leave._id}/affected-periods`);
  const [remark, setRemark] = useState('');
  const [status, setStatus] = useState(leave.status);
  const decide = async (decision) => { const r = await run(() => post(`/api/school/leave/${leave._id}/decide`, { decision, remark: remark || undefined }), `Leave ${decision}d`); if (r) { setStatus(r.status); } };
  const [subFor, setSubFor] = useState(null);
  return (
    <Modal wide title={`Leave · ${leave.teacherId?.name}`} onClose={onClose} footer={status === 'submitted' ? <><Button variant="danger" loading={busy} onClick={() => decide('reject')}>Reject</Button><Button variant="primary" loading={busy} onClick={() => decide('approve')}>Approve</Button></> : null}>
      <dl className="kv"><dt>Dates</dt><dd>{leave.halfDay ? `${fmtDate(leave.startDate, true)}, ${leave.halfSession === 'first' ? 'first' : 'second'} half (half a day)` : `${fmtDate(leave.startDate, true)} → ${fmtDate(leave.endDate, true)} (${leave.days} working days)`}</dd><dt>Type</dt><dd>{leave.leaveType}</dd><dt>Reason</dt><dd>{leave.reason}</dd><dt>Status</dt><dd><Badge tone={statusTone(status)}>{status}</Badge></dd></dl>
      {status === 'submitted' && <Field label="Remark (optional)"><Input value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>}
      <h3 style={{ margin: '16px 0 8px' }}>Periods affected</h3>
      <Async state={affected} empty={<div className="empty small">This teacher has no periods on those dates</div>}>{(rows) => <DataTable rows={rows} rowKey="entryId" columns={[{ label: 'Date', render: (a) => fmtDate(a.date) }, { label: 'Period', render: (a) => `${a.period} ${a.startTime}` }, { label: 'Class', render: (a) => `${L.sectionName(a.sectionId)}` }, { label: 'Subject', key: 'subject' },
        { label: 'Substitute', render: (a) => a.substitute ? <Badge tone="green">{a.substitute}</Badge> : <Button size="sm" onClick={() => setSubFor(a)}>Arrange</Button> }]} />}</Async>
      {subFor && <FormModal title={`Substitute · ${fmtDate(subFor.date)} ${subFor.period}`} fields={[{ name: 'substituteTeacherId', label: 'Substitute teacher', type: 'select', options: L.teacherOptions.filter((t) => t.value !== leave.teacherId?._id), required: true }]} onClose={() => setSubFor(null)}
        onSubmit={async (v) => { await post('/api/school/substitutions', { entryId: subFor.entryId, date: subFor.date, substituteTeacherId: v.substituteTeacherId, leaveId: leave._id, reason: 'Teacher on leave' }); affected.reload(); return true; }} />}
    </Modal>
  );
}
