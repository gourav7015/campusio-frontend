import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useLookups } from '../../hooks/useLookups.js';
import { post, put, del, download } from '../../api/client.js';
import DateSheet from '../../components/DateSheet.jsx';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Tabs, useAction, useDebounced, statusTone, fmtDate, label } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import { ComponentsEditor, cleanComponents, componentsText } from '../../components/Marks.jsx';
import ExamAnalysis from '../../components/ExamAnalysis.jsx';
import ExamOverview from '../../components/ExamOverview.jsx';
import { useDialogs } from '../../design/ui';

export const EXAM_TYPES = [['unit_test', 'Unit test'], ['class_test', 'Class test'], ['surprise_test', 'Surprise test'], ['half_yearly', 'Half-yearly'], ['annual', 'Annual'], ['practical', 'Practical'], ['other', 'Other']].map(([value, label]) => ({ value, label }));

/** Examinations: the exam list, and — per class — how many exams were held and how every student did. */
export function Exams() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'analysis';
  const setTab = (t) => setSp(t === 'analysis' ? {} : { tab: t });
  return (
    <div className="stack">
      <Tabs tabs={[['analysis', 'Class analysis'], ['list', 'Examinations & marks']]} value={tab} onChange={setTab} />
      {tab === 'analysis' ? <ClassAnalysis /> : <ExamList />}
    </div>
  );
}

function ClassAnalysis() {
  const L = useLookups();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const view = sp.get('view') === 'graphs' ? 'graphs' : 'summary';
  const setView = (v) => { const n = new URLSearchParams(sp); if (v === 'summary') n.delete('view'); else n.set('view', v); setSp(n, { replace: true }); };
  const [classId, setClassId] = useState(''); const [sectionId, setSectionId] = useState('');
  const sections = L.sections.filter((s) => s.classId === classId && s.yearId === L.currentYear?._id && s.status === 'active');
  const cls = L.classes.find((c) => c._id === classId)?.name; const sec = sections.find((x) => x._id === sectionId)?.name;
  return (
    <div className="stack">
      <PageHeader title="Class analysis" subtitle={classId ? `Marks and exams of ${cls}${sec ? ` ${sec}` : ''}. Switch between the tables and the graphs below.` : 'The whole school at a glance. Choose a class, or click one below, to see its exams and every student.'} actions={<>
        <Select aria-label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }} placeholder="Choose a class" options={L.classOptions} />
        <Select aria-label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)} placeholder="All sections" options={sections.map((x) => ({ value: x._id, label: x.name }))} disabled={!classId} /></>} />
      <Tabs tabs={[['summary', 'Tables'], ['graphs', 'Graphs']]} value={view} onChange={setView} />
      {!classId && <StudentFinder onPick={(id) => nav(`/admin/exams/student/${id}`)} />}
      {classId ? <ExamAnalysis classId={classId} sectionId={sectionId} view={view} /> : <ExamOverview view={view} onPickClass={(id) => { setClassId(id); setSectionId(''); }} />}
    </div>
  );
}

/** Find any student by name or admission number and open their marks. */
function StudentFinder({ onPick }) {
  const [q, setQ] = useState(''); const dq = useDebounced(q);
  const res = useApi(dq.trim().length >= 2 ? '/api/school/students' : null, { q: dq.trim(), limit: 8 });
  return (
    <Card>
      <Field label="Find a student" hint="Type a name or an admission number to open that student's marks.">
        <Input aria-label="Find a student" placeholder="Name or admission number" value={q} onChange={(e) => setQ(e.target.value)} />
      </Field>
      {dq.trim().length >= 2 && res.data && (
        <ul className="timeline" style={{ margin: '8px 0 0' }}>
          {res.data.items.length ? res.data.items.map((s) => (
            <li key={s._id} style={{ cursor: 'pointer' }} onClick={() => onPick(s._id)}><div className="grow"><b>{s.name}</b><div className="small muted">{s.admissionNo}{s.enrolment?.className ? ` · ${s.enrolment.className}${s.enrolment.section ? ` ${s.enrolment.section}` : ''}` : ''}</div></div><div className="right"><Button size="sm" onClick={(e) => { e.stopPropagation(); onPick(s._id); }}>Open marks</Button></div></li>
          )) : <li><div className="grow muted">No student matches “{dq}”.</div></li>}
        </ul>
      )}
    </Card>
  );
}

const STANDARD_EXAMS = ['Unit Test 1', 'Unit Test 2', 'Half-Yearly', 'Unit Test 3', 'Unit Test 4', 'Final Exam'];

function ExamList() {
  const nav = useNavigate();
  const L = useLookups();
  const list = useApi('/api/school/exams');
  const [modal, setModal] = useState(false); const [run, busy] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Examinations" subtitle="The standard examinations of the year, each with a date sheet for every class. Then review teachers' marks and publish results." actions={<>
        {STANDARD_EXAMS.some((n) => !(list.data || []).some((e) => e.name === n)) && <Button loading={busy} onClick={async () => { await run(() => post('/api/school/exams/standard'), (r) => `${r.created} examination(s) added`); list.reload(); }}>Add the standard exams</Button>}
        <Button variant="primary" onClick={() => setModal(true)}>+ New examination</Button></>} />
      <Card flush><Async state={list} empty={<Empty title="No examinations yet">Use “Add the standard exams” for Unit Test 1 to 4, Half-Yearly and the Final Exam, then fill each class's date sheet.</Empty>}>{(rows) => <DataTable rows={rows} onRowClick={(e) => nav(`/admin/exams/${e._id}`)} columns={[
        { label: 'Examination', render: (e) => <><b>{e.name}</b> <Badge>{label(e.type)}</Badge>{e.createdByName && <div className="small muted">Added by {e.createdByName}</div>}</> }, { label: 'Classes', render: (e) => e.classNames.join(', ') }, { label: 'Dates', render: (e) => (e.startDate ? `${fmtDate(e.startDate)} – ${fmtDate(e.endDate)}` : '—') }, { label: 'Subjects', key: 'subjectCount' },
        { label: 'Schedule', render: (e) => <Badge tone={e.schedulePublished ? 'green' : 'amber'}>{e.schedulePublished ? 'Published' : 'Draft'}</Badge> },
        { label: 'Marks', render: (e) => Object.entries(e.sheetStatus).map(([k, v]) => <Badge key={k} tone={statusTone(k)}>{v} {label(k)}</Badge>) },
      ]} />}</Async></Card>
      {modal && <FormModal wide title="New examination" fields={[{ name: 'name', label: 'Name', required: true, placeholder: 'Unit Test 2' }, { name: 'type', label: 'Type', type: 'select', options: EXAM_TYPES, default: 'unit_test', required: true },
        { name: 'classIds', label: 'Class', type: 'select', options: L.classOptions, required: true, hint: 'Add more classes later by editing' }, { name: 'startDate', label: 'Starts', type: 'date' }, { name: 'endDate', label: 'Ends', type: 'date' }, { name: 'marksDeadline', label: 'Marks entry deadline', type: 'date' }]}
        onClose={() => setModal(false)} onSubmit={async (v) => { const e = await post('/api/school/exams', { ...v, classIds: [v.classIds] }); nav(`/admin/exams/${e._id}`); return true; }} />}
    </div>
  );
}

export function ExamDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const L = useLookups();
  const [tab, setTab] = useState('datesheet');
  const ex = useApi(`/api/school/exams/${id}`);
  const sheets = useApi(tab === 'marks' ? `/api/school/exams/${id}/sheets` : null);
  const results = useApi(tab === 'results' ? `/api/school/exams/${id}/results` : null);
  const [run, busy] = useAction();
  const [modal, setModal] = useState(null);
  const [review, setReview] = useState(null);
  const [publishOut, setPublishOut] = useState(null);
  return (
    <Async state={ex}>{(e) => (
      <div className="stack">
        <PageHeader title={e.name} subtitle={`${e.status} · marks deadline ${fmtDate(e.marksDeadline, true)}`} actions={<>
          <Button onClick={async () => { await run(() => post(`/api/school/exams/${id}/subjects/generate`), (r) => `${r.created} subject(s) added from offerings`); ex.reload(); }}>Add subjects from offerings</Button>
          <Button variant="primary" onClick={async () => { await run(() => post(`/api/school/exams/${id}/publish-schedule`), 'Schedule published to students'); ex.reload(); }} disabled={!e.subjects.length}>{e.schedulePublished ? 'Re-notify schedule' : 'Publish schedule'}</Button>
          <ConfirmButton variant="danger" message="Delete this examination? Only possible before marks entry." onConfirm={async () => { const ok = await run(() => del(`/api/school/exams/${id}`), 'Deleted'); if (ok) nav('/admin/exams'); }}>Delete</ConfirmButton></>} />
        <Tabs tabs={[['datesheet', 'Date sheet'], ['subjects', 'All papers'], ['marks', 'Marks review & publish'], ['results', 'Published results']]} value={tab} onChange={setTab} />
        {tab === 'datesheet' && <DateSheet examId={id} exam={e} onChanged={ex.reload} />}
        {tab === 'subjects' && (<Card flush action={<Button size="sm" onClick={() => setModal({})}>+ Add / edit subject</Button>} title="Exam subjects">
          <DataTable rows={e.subjects} empty="No subjects yet — add them from offerings or manually" columns={[{ label: 'Class', key: 'className' }, { label: 'Subject', render: (s) => <b>{s.subject}</b> }, { label: 'Date', render: (s) => fmtDate(s.date) }, { label: 'Time', render: (s) => (s.startTime ? `${s.startTime}–${s.endTime}` : '—') }, { label: 'Room', key: 'room' },
            { label: 'Marks fields', render: (s) => `${componentsText(s.components)} = ${s.max}` }, { label: 'Pass', key: 'passMarks' },
            { label: '', render: (s) => <div className="row"><Button size="sm" onClick={() => setModal(s)}>Edit</Button><ConfirmButton size="sm" variant="danger" message="Remove this subject?" onConfirm={async () => { await run(() => del(`/api/school/exams/${id}/subjects/${s._id}`), 'Removed'); ex.reload(); }}>Remove</ConfirmButton></div> }]} /></Card>)}
        {tab === 'marks' && (<div className="stack">
          <div className="row"><Button variant="primary" loading={busy} onClick={async () => { const r = await run(() => post(`/api/school/exams/${id}/publish`, { all: true })); if (r) { setPublishOut(r); sheets.reload(); } }}>Publish results for all ready sections</Button><span className="muted small">A section is published only when every subject's marks are approved.</span></div>
          {publishOut && <div className={publishOut.published.length ? 'alert ok' : 'alert info'}>Published: {publishOut.published.map((p) => `${p.section} (${p.reportCards} report cards)`).join(', ') || 'none'}.{publishOut.skipped.length > 0 && <> Skipped: {publishOut.skipped.map((s) => `${s.section} — ${s.reason}`).join('; ')}.</>}</div>}
          <Card flush><Async state={sheets} empty={<div className="empty">No teacher has started entering marks</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Section', key: 'section' }, { label: 'Subject', render: (s) => <b>{s.subject}</b> }, { label: 'Teacher', key: 'teacher' }, { label: 'Entries', key: 'entries' }, { label: 'Status', render: (s) => <Badge tone={statusTone(s.status)}>{label(s.status)}</Badge> }, { label: '', render: (s) => <Button size="sm" onClick={() => setReview(s)}>Open</Button> }]} />}</Async></Card></div>)}
        {tab === 'results' && (<Card flush action={<Button size="sm" onClick={() => run(() => download('/api/school/export/results.csv', `results-${e.name}.csv`, { examId: id }))}>Export CSV</Button>} title="Report cards (current versions)">
          <Async state={results} empty={<div className="empty">Nothing published yet</div>}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Adm. no', key: 'admissionNo' }, { label: 'Student', render: (r) => <b>{r.student}</b> }, { label: 'Total', render: (r) => `${r.totalObtained}/${r.totalMax}` }, { label: '%', key: 'percentage' }, { label: 'Grade', key: 'grade' }, { label: 'Result', render: (r) => <Badge tone={r.resultStatus === 'pass' ? 'green' : 'red'}>{r.resultStatus}</Badge> }, { label: 'Version', key: 'version' },
            { label: '', render: (r) => <div className="row"><Button size="sm" onClick={() => run(() => download(`/api/school/report-cards/${r.id}/pdf`, `report-card-${r.admissionNo}.pdf`))}>PDF</Button><Button size="sm" onClick={() => setModal({ remark: r })}>Remarks</Button></div> }]} />}</Async></Card>)}
        {modal && !modal.remark && <ExamSubjectModal exam={e} L={L} row={modal} onClose={() => setModal(null)} onSave={async (v) => { await put(`/api/school/exams/${id}/subjects`, v); ex.reload(); }} />}
        {modal?.remark && <FormModal title={`Remarks · ${modal.remark.student}`} fields={[{ name: 'teacherRemark', label: 'Class teacher remark', type: 'textarea' }, { name: 'principalRemark', label: 'Principal remark', type: 'textarea' }]} onClose={() => setModal(null)} onSubmit={async (v) => { await put(`/api/school/exams/${id}/remarks`, { studentId: modal.remark.studentId, ...v }); results.reload(); return true; }}><p className="small muted" style={{ marginTop: 10 }}>Changing remarks on a published report card creates a new version; the earlier version is kept.</p></FormModal>}
        {review && <SheetReview sheet={review} run={run} onClose={() => { setReview(null); sheets.reload(); }} />}
      </div>)}</Async>
  );
}

function ExamSubjectModal({ exam, L, row, onClose, onSave }) {
  const edit = !!row._id;
  const [v, setV] = useState({ classId: row.classId || '', subjectId: row.subjectId || '', date: row.date || '', startTime: row.startTime || '', endTime: row.endTime || '', room: row.room || '', passMarks: row.passMarks ?? '', marksDeadline: row.marksDeadline || '' });
  const [components, setComponents] = useState(row.components?.length ? row.components : [{ label: 'Marks', max: 100 }]);
  const [run, busy] = useAction();
  const set = (k, x) => setV((s) => ({ ...s, [k]: x }));
  const save = async () => {
    const body = { classId: v.classId, subjectId: v.subjectId, components: cleanComponents(components) };
    ['date', 'startTime', 'endTime', 'room', 'marksDeadline'].forEach((k) => v[k] && (body[k] = v[k]));
    if (v.passMarks !== '') body.passMarks = Number(v.passMarks);
    const ok = await run(() => onSave(body).then(() => true)); if (ok) onClose();
  };
  return (
    <Modal wide title={edit ? 'Edit exam subject' : 'Add exam subject'} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!v.classId || !v.subjectId || components.some((c) => !String(c.label).trim() || !(c.max > 0))} onClick={save}>Save</Button></>}>
      <div className="form-grid">
        {!edit && <Field label="Class"><Select value={v.classId} onChange={(ev) => set('classId', ev.target.value)} placeholder="Select" options={L.classOptions.filter((c) => exam.classIds.includes(c.value))} /></Field>}
        {!edit && <Field label="Subject"><Select value={v.subjectId} onChange={(ev) => set('subjectId', ev.target.value)} placeholder="Select" options={L.subjectOptions} /></Field>}
        <Field label="Date"><Input type="date" value={v.date} onChange={(ev) => set('date', ev.target.value)} /></Field><Field label="Room"><Input value={v.room} onChange={(ev) => set('room', ev.target.value)} /></Field>
        <Field label="Starts"><Input type="time" value={v.startTime} onChange={(ev) => set('startTime', ev.target.value)} /></Field><Field label="Ends"><Input type="time" value={v.endTime} onChange={(ev) => set('endTime', ev.target.value)} /></Field>
        <Field label="Pass marks (total)"><Input type="number" value={v.passMarks} onChange={(ev) => set('passMarks', ev.target.value)} /></Field><Field label="Marks deadline"><Input type="date" value={v.marksDeadline} onChange={(ev) => set('marksDeadline', ev.target.value)} /></Field>
        <div className="full"><div className="bold" style={{ marginBottom: 6 }}>Marks fields</div><p className="small muted" style={{ margin: '0 0 8px' }}>Teachers enter marks for exactly these fields. Locked once marks entry has started.</p><ComponentsEditor value={components} onChange={setComponents} /></div>
      </div>
    </Modal>
  );
}

function SheetReview({ sheet, onClose, run }) {
  const dlg = useDialogs();
  const d = useApi(`/api/school/sheets/${sheet._id}`);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState(sheet.status);
  const act = async (a, body) => { const r = await run(() => post(`/api/school/sheets/${sheet._id}/${a}`, body), 'Done'); if (r) { setStatus(r.status); d.reload(); } };
  const correct = async (row, comps) => {
    const reasonTxt = await dlg.prompt('Reason for correcting this published mark (required)', { title: 'Correct a published mark', required: true }); if (!reasonTxt) return;
    const values = {};
    for (const c of comps) { const nv = await dlg.prompt(`${c.label} (max ${c.max})`, { title: 'New mark', defaultValue: String(row.values?.[c.key] ?? ''), multiline: false }); if (nv === null) return; if (nv !== '') values[c.key] = Number(nv); }
    const out = await run(() => post(`/api/school/marks/${row._id}/correct`, { values, reason: reasonTxt }), 'Correction applied — a new report-card version was issued'); if (out) d.reload();
  };
  return (
    <Modal wide title={`${sheet.section} · ${sheet.subject} · ${label(status)}`} onClose={onClose} footer={['submitted', 'under_review'].includes(status) ? <>
      {status === 'submitted' && <Button onClick={() => act('start-review')}>Start review</Button>}<Button variant="danger" disabled={reason.length < 3} onClick={() => act('return', { reason })}>Return for correction</Button><Button variant="primary" onClick={() => act('approve')}>Approve</Button></> : null}>
      <Async state={d}>{(x) => (<>
        <DataTable rows={x.rows} columns={[{ label: 'Student', key: 'student' },
          ...x.examSubject.components.map((c) => ({ label: `${c.label} /${c.max}`, render: (r) => (r.absent ? 'AB' : r.exempt ? 'EX' : r.values?.[c.key] ?? '—') })),
          { label: `Total / ${x.examSubject.max}`, render: (r) => <b>{r.total ?? '—'}</b> }, { label: 'Remarks', key: 'remarks' },
          ...(status === 'published' ? [{ label: '', render: (r) => <Button size="sm" onClick={() => correct(r, x.examSubject.components)}>Correct</Button> }] : [])]} />
        {['submitted', 'under_review'].includes(status) && <Field label="Reason (needed to return the sheet to the teacher)"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Please re-check practical marks" /></Field>}
        {x.sheet.returnReason && <div className="alert info" style={{ marginTop: 10 }}>Last return reason: {x.sheet.returnReason}</div>}</>)}</Async>
    </Modal>
  );
}
