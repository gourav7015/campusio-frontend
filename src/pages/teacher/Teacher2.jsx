import { useEffect, useMemo, useRef, useState } from 'react';
import { leaveFields, leavePayload, daysText } from '../../components/leaveForm.js';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { post, put, patch, del, upload, openFile } from '../../api/client.js';
import { ComponentsEditor, cleanComponents, componentsText } from '../../components/Marks.jsx';
import { Async, Badge, Button, Card, ConfirmButton, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Stat, Tabs, useAction, fmtDate, fmtDateTime, fmtPct, label, statusTone, Spinner } from '../../components/ui.jsx';
import { TrendChart, BarsChart, ScatterPlot } from '../../components/Charts.jsx';
import FormModal from '../../components/FormModal.jsx';
import { parseCsv } from '../../lib.js';
import { useDialogs } from '../../design/ui';
import { safeHref } from '../../design/lib/url';
import { Avatar, PhotoUpload } from '../../components/FileImage.jsx';

const T = '/api/teacher';
const today = () => new Date().toLocaleDateString('en-CA');

function useMyAssignments() {
  const classes = useApi(`${T}/classes`);
  const subjects = useApi(`${T}/subjects`);
  const pairs = useMemo(() => (subjects.data || []).flatMap((s) => s.assignments.map((a) => ({ sectionId: a.sectionId, subjectId: s.subjectId, label: `${a.className} ${a.section} · ${s.name}` }))), [subjects.data]);
  return { classes, subjects, pairs };
}

// ───────────── Homework ─────────────
export function Homework() {
  const dlg = useDialogs();
  const [sp, setSp] = useSearchParams();
  const list = useApi(`${T}/homework`, { tab: 'all' });
  const { pairs } = useMyAssignments();
  const [modal, setModal] = useState(sp.get('new') ? {} : null);
  const [run] = useAction();
  const fileRef = useRef(); const target = useRef(null);
  // Kept simple: a homework is saved and the students of that class see it on their dashboard. No drafts, no marks, no hand-in.
  const fields = (edit) => [
    ...(edit ? [] : [{ name: 'pair', label: 'Class & subject', type: 'select', required: true, options: pairs.map((p) => ({ value: `${p.sectionId}|${p.subjectId}`, label: p.label })) }]),
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'description', label: 'What to do', type: 'textarea', full: true },
    { name: 'dueDate', label: 'Due date', type: 'date', required: true },
  ];
  return (
    <div className="stack">
      <PageHeader title="Homework" subtitle="Give homework to a class. The students see it on their dashboard." actions={<Button variant="primary" onClick={() => setModal({})} disabled={!pairs.length}>+ Add homework</Button>} />
      <Card flush><Async state={list} empty={<Empty title="No homework yet" />}>{(rows) => <DataTable rows={rows.filter((h) => h.status !== 'archived')} columns={[{ label: 'Title', render: (h) => <><b>{h.title}</b>{h.description && <div className="small muted" style={{ maxWidth: 420, whiteSpace: 'pre-line' }}>{h.description}</div>}</> }, { label: 'Class', render: (h) => `${h.className} ${h.section}` }, { label: 'Subject', key: 'subject' }, { label: 'Due', render: (h) => fmtDate(h.dueDate, true) },
          { label: 'File', render: (h) => h.attachmentFiles?.length ? h.attachmentFiles.map((f) => <a key={f._id} className="chip" style={{ marginRight: 6 }} href="#!" onClick={(e) => { e.preventDefault(); openFile(f._id); }}>{f.originalName}</a>) : <Button size="sm" onClick={() => { target.current = h._id; fileRef.current.click(); }}>Add a file</Button> },
          { label: '', render: (h) => <div className="row"><Button size="sm" onClick={() => setModal(h)}>Edit</Button><ConfirmButton size="sm" variant="danger" message="Delete this homework? Students will no longer see it." onConfirm={async () => { await run(() => del(`${T}/homework/${h._id}`), 'Deleted'); list.reload(); }}>Delete</ConfirmButton></div> }]} />}</Async></Card>
      <input type="file" hidden ref={fileRef} onChange={async (e) => { const f = e.target.files[0]; if (!f || !target.current) return; const fd = new FormData(); fd.append('file', f); await run(() => upload(`${T}/homework/${target.current}/attachments`, fd), 'File added'); e.target.value = ''; list.reload(); }} />
      {modal && <FormModal title={modal._id ? 'Edit homework' : 'Add homework'} initial={modal} fields={fields(!!modal._id)} onClose={() => { setModal(null); if (sp.get('new')) setSp({}); }}
        onSubmit={async (v) => {
          if (modal._id) { await patch(`${T}/homework/${modal._id}`, v); list.reload(); return true; }
          const { pair, ...rest } = v; const [sectionId, subjectId] = pair.split('|');
          const h = await post(`${T}/homework`, { ...rest, sectionId, subjectId, status: 'published', type: 'written' });
          list.reload(); target.current = h._id; if ((await dlg.confirm('Homework added. Attach a file (a worksheet, for example)?', { title: 'Attach a file?', confirmLabel: 'Attach a file', cancelLabel: 'No, done' }))) fileRef.current.click(); return true; }} />}
    </div>
  );
}

// ───────────── Study materials ─────────────
export function Materials() {
  const [sp, setSp] = useSearchParams();
  const [f, setF] = useState({ sectionId: '', subjectId: '', status: '' });
  const list = useApi(`${T}/materials`, f);
  const { pairs, classes, subjects } = useMyAssignments();
  const [modal, setModal] = useState(sp.get('new') ? {} : null);
  const [run] = useAction();
  const fileRef = useRef(); const replaceId = useRef(null);
  const act = async (m, a) => { await run(() => post(`${T}/materials/${m._id}/${a}`), `Material ${a}ed`); list.reload(); };
  return (
    <div className="stack">
      <PageHeader title="Study materials" subtitle="Students see a material only once it is published and applies to their class" actions={<Button variant="primary" onClick={() => setModal({})} disabled={!pairs.length}>+ Upload material</Button>} />
      <Card flush>
        <div className="card-b row wrap"><Select value={f.sectionId} onChange={(e) => setF({ ...f, sectionId: e.target.value })} options={(classes.data || []).map((c) => ({ value: c.sectionId, label: `${c.className} ${c.section}` }))} placeholder="All sections" aria-label="Section" />
          <Select value={f.subjectId} onChange={(e) => setF({ ...f, subjectId: e.target.value })} options={(subjects.data || []).map((s) => ({ value: s.subjectId, label: s.name }))} placeholder="All subjects" aria-label="Subject" />
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={['draft', 'published', 'unpublished', 'archived'].map((s) => ({ value: s, label: label(s) }))} placeholder="Any status" aria-label="Status" /></div>
        <Async state={list} empty={<Empty title="No materials" />}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Title', render: (m) => <b>{m.title}</b> }, { label: 'Class', render: (m) => `${m.className} ${m.section}` }, { label: 'Subject', key: 'subject' }, { label: 'Chapter', key: 'chapter' }, { label: 'Type', key: 'materialType' }, { label: 'Uploaded', render: (m) => fmtDate(m.createdAt, true) }, { label: 'Status', render: (m) => <Badge tone={statusTone(m.status)}>{label(m.status)}</Badge> },
          { label: '', render: (m) => <div className="row">{m.file && <Button size="sm" onClick={() => run(() => openFile(m.file._id))}>Preview</Button>}{m.externalUrl && <a className="btn sm" href={safeHref(m.externalUrl)} target="_blank" rel="noopener noreferrer">Open link</a>}
            {m.status !== 'published' && m.status !== 'archived' && <Button size="sm" variant="primary" onClick={() => act(m, 'publish')}>Publish</Button>}{m.status === 'published' && <Button size="sm" onClick={() => act(m, 'unpublish')}>Unpublish</Button>}
            {m.fileId && m.status !== 'archived' && <Button size="sm" onClick={() => { replaceId.current = m._id; fileRef.current.click(); }}>Replace file</Button>}{m.status !== 'archived' && <Button size="sm" onClick={() => act(m, 'archive')}>Archive</Button>}</div> }]} />}</Async>
      </Card>
      <input type="file" hidden ref={fileRef} onChange={async (e) => { const file = e.target.files[0]; if (!file || !replaceId.current) return; const fd = new FormData(); fd.append('file', file); await run(() => upload(`${T}/materials/${replaceId.current}/file`, fd), 'File replaced'); e.target.value = ''; list.reload(); }} />
      {modal && <MaterialForm pairs={pairs} onClose={() => { setModal(null); if (sp.get('new')) setSp({}); }} onDone={() => { setModal(null); list.reload(); }} />}
    </div>
  );
}

function MaterialForm({ pairs, onClose, onDone }) {
  const [v, setV] = useState({ title: '', pair: '', chapter: '', materialType: 'pdf', description: '', externalUrl: '', status: 'draft', publishDate: '', expiryDate: '' });
  const [file, setFile] = useState(null);
  const [run, busy] = useAction();
  const set = (k, val) => setV((s) => ({ ...s, [k]: val }));
  const save = async () => {
    const [sectionId, subjectId] = v.pair.split('|');
    const fd = new FormData();
    Object.entries({ title: v.title, sectionId, subjectId, chapter: v.chapter, materialType: v.materialType, description: v.description, status: v.status, publishDate: v.publishDate, expiryDate: v.expiryDate, externalUrl: file ? '' : v.externalUrl }).forEach(([k, val]) => val && fd.append(k, val));
    if (file) fd.append('file', file);
    const ok = await run(() => upload(`${T}/materials`, fd), 'Material saved'); if (ok) onDone();
  };
  return (
    <Modal wide title="Upload study material" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!v.title || !v.pair || (!file && !v.externalUrl)} onClick={save}>Save</Button></>}>
      <div className="form-grid">
        <Field label="Title" full><Input value={v.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Class & subject"><Select value={v.pair} onChange={(e) => set('pair', e.target.value)} placeholder="Select" options={pairs.map((p) => ({ value: `${p.sectionId}|${p.subjectId}`, label: p.label }))} /></Field>
        <Field label="Chapter"><Input value={v.chapter} onChange={(e) => set('chapter', e.target.value)} placeholder="Chapter 4 – Algebra" /></Field>
        <Field label="Type"><Select value={v.materialType} onChange={(e) => set('materialType', e.target.value)} options={['pdf', 'image', 'document', 'presentation', 'video', 'worksheet'].map((t) => ({ value: t, label: label(t) }))} /></Field>
        <Field label="Visibility"><Select value={v.status} onChange={(e) => set('status', e.target.value)} options={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Publish now' }]} /></Field>
        <Field label="File" hint="PDF, image, Office document (max 10 MB)"><input type="file" onChange={(e) => setFile(e.target.files[0] || null)} /></Field>
        <Field label="…or external link" hint="e.g. a video"><Input value={v.externalUrl} disabled={!!file} onChange={(e) => set('externalUrl', e.target.value)} placeholder="https://" /></Field>
        <Field label="Publication date"><Input type="date" value={v.publishDate} onChange={(e) => set('publishDate', e.target.value)} /></Field><Field label="Expiry date (optional)"><Input type="date" value={v.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} /></Field>
        <Field label="Description" full><textarea rows={2} value={v.description} onChange={(e) => set('description', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// ───────────── Examinations & marks (one screen) ─────────────
const TYPES = [['unit_test', 'Unit test'], ['class_test', 'Class test'], ['surprise_test', 'Surprise test'], ['other', 'Other']].map(([value, l]) => ({ value, label: l }));
const EDITABLE = ['not_started', 'draft', 'returned'];

function ExamForm({ pairs, initial, onClose, onDone }) {
  const edit = !!initial;
  const [v, setV] = useState({ type: initial?.type || 'class_test', name: initial?.exam || '', pair: '', date: initial?.date || today(), marksDeadline: initial?.deadline || '', startTime: '', endTime: '', room: '', passMarks: initial?.passMarks ?? '', notify: initial?.type !== 'surprise_test' });
  const [components, setComponents] = useState(initial?.components?.length ? initial.components.map((c) => ({ label: c.label, max: c.max })) : [{ label: 'Marks', max: 20 }]);
  const [run, busy] = useAction();
  const set = (k, x) => setV((s) => ({ ...s, [k]: x }));
  const suggest = (t) => ({ unit_test: 'Unit Test 1', class_test: 'Class Test 1', surprise_test: 'Surprise Test', other: '' }[t]);
  const total = components.reduce((n, c) => n + (Number(c.max) || 0), 0);
  const valid = v.name.trim().length >= 2 && (edit || v.pair) && v.date && components.every((c) => String(c.label).trim() && c.max > 0);
  const save = async () => {
    const comps = cleanComponents(components);
    const ok = await run(async () => {
      if (edit) return patch(`${T}/exams/${initial.examId}`, { name: v.name, date: v.date, ...(v.marksDeadline ? { marksDeadline: v.marksDeadline } : {}), ...(initial.status === 'not_started' ? { components: comps } : {}), ...(v.passMarks !== '' ? { passMarks: Number(v.passMarks) } : {}) });
      const [sectionId, subjectId] = v.pair.split('|');
      return post(`${T}/exams`, { name: v.name, type: v.type, sectionId, subjectId, date: v.date, components: comps, notifyStudents: v.notify, ...(v.marksDeadline ? { marksDeadline: v.marksDeadline } : {}), ...(v.startTime ? { startTime: v.startTime } : {}), ...(v.endTime ? { endTime: v.endTime } : {}), ...(v.room ? { room: v.room } : {}), ...(v.passMarks !== '' ? { passMarks: Number(v.passMarks) } : {}) });
    }, edit ? 'Test updated' : 'Test added');
    if (ok) onDone();
  };
  return (
    <Modal wide title={edit ? `Edit ${initial.exam}` : 'Add an exam'} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!valid} onClick={save}>{edit ? 'Save' : 'Add exam'}</Button></>}>
      <div className="form-grid">
        {!edit && <Field label="Type"><Select value={v.type} onChange={(e) => { set('type', e.target.value); if (!v.name || Object.values({ a: 'Unit Test 1', b: 'Class Test 1', c: 'Surprise Test' }).includes(v.name)) set('name', suggest(e.target.value)); set('notify', e.target.value !== 'surprise_test'); }} options={TYPES} /></Field>}
        <Field label="Name" hint="e.g. Unit Test 1, Class Test 3, Surprise quiz"><Input value={v.name} onChange={(e) => set('name', e.target.value)} placeholder={suggest(v.type)} /></Field>
        {!edit && <Field label="Class & subject" full><Select value={v.pair} onChange={(e) => set('pair', e.target.value)} placeholder="Select" options={pairs.map((p) => ({ value: `${p.sectionId}|${p.subjectId}`, label: p.label }))} /></Field>}
        <Field label="Date"><Input type="date" value={v.date} onChange={(e) => set('date', e.target.value)} /></Field><Field label="Marks entry deadline"><Input type="date" value={v.marksDeadline} onChange={(e) => set('marksDeadline', e.target.value)} /></Field>
        {!edit && <><Field label="Starts"><Input type="time" value={v.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field><Field label="Ends"><Input type="time" value={v.endTime} onChange={(e) => set('endTime', e.target.value)} /></Field></>}
        <Field label="Pass marks (optional)" hint={`Defaults to the school's pass percentage of ${total}`}><Input type="number" value={v.passMarks} onChange={(e) => set('passMarks', e.target.value)} /></Field>
        {!edit && <label className="row" style={{ alignSelf: 'end' }}><input type="checkbox" checked={v.notify} onChange={(e) => set('notify', e.target.checked)} /> Tell students about it now{v.type === 'surprise_test' && <span className="muted small"> (off for a surprise)</span>}</label>}
        <div className="full"><div className="bold" style={{ marginBottom: 6 }}>Marks fields</div><p className="small muted" style={{ margin: '0 0 8px' }}>What will you give marks for? Add a field for each part, e.g. Written 40 + Oral 10.{edit && initial.status !== 'not_started' ? ' Fields are locked once marks entry has started.' : ''}</p><ComponentsEditor value={components} onChange={setComponents} locked={edit && initial.status !== 'not_started'} /></div>
      </div>
    </Modal>
  );
}

export function Exams() {
  const list = useApi(`${T}/exams`);
  const corr = useApi(`${T}/marks/corrections`);
  const { pairs } = useMyAssignments();
  const nav = useNavigate();
  const [modal, setModal] = useState(null);
  const [run] = useAction();
  const [tab, setTab] = useState('all');
  const [fClass, setFClass] = useState(''); const [fSubject, setFSubject] = useState('');
  const all = list.data || [];
  const classOf = (r) => `${r.className} ${r.section}`;
  const classOptions = [...new Set(all.map(classOf))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const subjectOptions = [...new Set(all.map((r) => r.subject).filter(Boolean))].sort();
  const filtered = (rows) => rows.filter((r) => (!fClass || classOf(r) === fClass) && (!fSubject || r.subject === fSubject)).filter((r) => tab === 'all' || (tab === 'todo' ? EDITABLE.includes(r.status) : tab === 'mine' ? r.createdByMe : ['submitted', 'under_review', 'approved', 'published'].includes(r.status)));
  return (
    <div className="stack">
      <PageHeader title="Examinations & marks" subtitle="Exams for your classes and subjects — add your own tests, enter marks, and follow them through approval" actions={<Button variant="primary" onClick={() => setModal({})} disabled={!pairs.length}>+ Add exam</Button>} />
      <div className="row between" style={{ alignItems: 'center' }}>
        <Tabs tabs={[['all', 'All'], ['todo', 'Marks to enter'], ['done', 'Submitted / done'], ['mine', 'Tests I added']]} value={tab} onChange={setTab} />
        <div className="row" style={{ alignItems: 'center', gap: 10 }}>
          <Select aria-label="Class" value={fClass} onChange={(e) => setFClass(e.target.value)} options={classOptions} placeholder="All classes" />
          <Select aria-label="Subject" value={fSubject} onChange={(e) => setFSubject(e.target.value)} options={subjectOptions} placeholder="All subjects" />
          {(fClass || fSubject) && <Button size="sm" onClick={() => { setFClass(''); setFSubject(''); }}>Clear</Button>}
        </div>
      </div>
      <Card flush><Async state={list} empty={<Empty title="No examinations for your subjects yet">Add a class test or surprise test, or wait for the school to schedule one.</Empty>}>{(rows) => <DataTable rows={filtered(rows)} empty="Nothing in this view" rowKey={(r) => `${r.examSubjectId}-${r.sectionId}`} columns={[
        { label: 'Examination', render: (r) => <><b>{r.exam}</b> <Badge tone={r.type === 'surprise_test' ? 'amber' : r.createdByMe ? 'blue' : ''}>{label(r.type)}</Badge></> }, { label: 'Class', render: (r) => `${r.className} ${r.section}` }, { label: 'Subject', key: 'subject' }, { label: 'Date', render: (r) => fmtDate(r.date) },
        { label: 'Marks fields', render: (r) => componentsText(r.components) }, { label: 'Max', key: 'max' }, { label: 'Deadline', render: (r) => <>{fmtDate(r.deadline)} {r.overdue && <Badge tone="red">Overdue</Badge>}</> }, { label: 'Marks status', render: (r) => <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge> },
        { label: '', render: (r) => <div className="row"><Button size="sm" variant={EDITABLE.includes(r.status) ? 'primary' : undefined} onClick={() => nav(`/teacher/exams/${r.examSubjectId}/${r.sectionId}`)}>{EDITABLE.includes(r.status) ? 'Enter marks' : 'View'}</Button>
          {r.createdByMe && <Button size="sm" onClick={() => setModal(r)}>Edit</Button>}{r.canDelete && <ConfirmButton size="sm" variant="danger" message={`Delete ${r.exam}? Only possible before any marks are entered.`} onConfirm={async () => { await run(() => del(`${T}/exams/${r.examId}`), 'Test deleted'); list.reload(); }}>Delete</ConfirmButton>}</div> }]} />}</Async></Card>
      <Card title="Correction requests" flush><Async state={corr} empty={<div className="empty small">No mark sheets have been returned to you</div>}>{(rows) => <DataTable rows={rows} rowKey="sheetId" columns={[{ label: 'Exam', key: 'exam' }, { label: 'Subject', key: 'subject' }, { label: 'Section', key: 'section' }, { label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge> }, { label: 'Reason', render: (r) => r.returnReason || r.history.at(-1)?.reason }]} />}</Async></Card>
      {modal && <ExamForm pairs={pairs} initial={modal.examId ? modal : null} onClose={() => setModal(null)} onDone={() => { setModal(null); list.reload(); }} />}
    </div>
  );
}

export function MarksSheet() {
  const dlg = useDialogs();
  const { examSubjectId, sectionId } = useParams();
  const sheet = useApi(`${T}/marks/sheet`, { examSubjectId, sectionId });
  const [rows, setRows] = useState(null);
  const [saved, setSaved] = useState(null);
  const [run, busy] = useAction();
  const dirty = useRef(new Set());
  const timer = useRef();
  const d = sheet.data;
  useEffect(() => { if (d) setRows(d.students); }, [d]);
  const comps = d?.examSubject.components || [];
  const latest = useRef(rows);
  useEffect(() => { latest.current = rows; }, [rows]);
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  const payload = (list, ids) => list.filter((r) => ids.has(r.studentId)).map((r) => ({ studentId: r.studentId, values: Object.fromEntries(comps.map((c) => [c.key, num(r.values?.[c.key])])), absent: !!r.absent, exempt: !!r.exempt, remarks: r.remarks || undefined }));
  const invalid = (r) => comps.some((c) => { const n = num(r.values?.[c.key]); return n !== null && (n < 0 || n > c.max); });
  // Always reads the newest rows (the debounce timer would otherwise save a stale snapshot).
  const save = async (all) => {
    const list = latest.current || [];
    const ids = all ? new Set(list.map((r) => r.studentId)) : new Set(dirty.current);
    if (!ids.size) return true;
    if (list.some((r) => ids.has(r.studentId) && invalid(r))) return false;
    try { await put(`${T}/marks/sheet`, { examSubjectId, sectionId, marks: payload(list, ids) }); dirty.current = new Set(); setSaved(new Date()); return true; }
    catch (e) { await run(async () => { throw e; }); return false; }
  };
  const edit = (id, patchObj) => { setRows((rs) => rs.map((r) => (r.studentId === id ? { ...r, ...patchObj } : r))); dirty.current.add(id); clearTimeout(timer.current); timer.current = setTimeout(() => save(false), 1500); };
  const setVal = (r, key, val) => edit(r.studentId, { values: { ...(r.values || {}), [key]: val === '' ? null : val } });
  useEffect(() => () => clearTimeout(timer.current), []);
  const total = (r) => (r.absent || r.exempt ? null : comps.reduce((n, c) => n + (num(r.values?.[c.key]) || 0), 0));
  const submit = async () => {
    if (!(await save(true))) return;
    const r = await run(() => post(`${T}/marks/sheet/submit`, { examSubjectId, sectionId }), 'Marks submitted for approval'); if (r) sheet.reload();
  };
  const importCsv = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const parsed = parseCsv(await f.text());
    const byHeader = (row, c) => { const k = Object.keys(row).find((h) => h.trim().toLowerCase() === c.label.toLowerCase() || h.trim().toLowerCase() === c.key); return k === undefined || row[k] === '' ? undefined : Number(row[k]); };
    const data = parsed.map((r) => ({ admissionNo: r.admissionNo || undefined, rollNo: r.rollNo ? Number(r.rollNo) : undefined, values: Object.fromEntries(comps.map((c) => [c.key, byHeader(r, c)]).filter(([, v]) => v !== undefined)), absent: /^(1|true|yes|ab)$/i.test(r.absent || '') || undefined, remarks: r.remarks || undefined }));
    const dry = await run(() => post(`${T}/marks/import`, { examSubjectId, sectionId, rows: data, dryRun: true }));
    e.target.value = ''; if (!dry) return;
    if (dry.errors.length && !(await dlg.confirm(`${dry.errors.length} row(s) have problems:\n${dry.errors.slice(0, 5).map((x) => `Row ${x.row}: ${x.error}`).join('\n')}\n\nImport the ${dry.valid} valid row(s) anyway?`))) return;
    await run(() => post(`${T}/marks/import`, { examSubjectId, sectionId, rows: data, skipInvalid: true }), (r) => `${r.applied} row(s) imported`); sheet.reload();
  };
  if (sheet.loading && !d) return <Spinner />;
  if (sheet.error) return <div className="alert">{sheet.error.message}</div>;
  if (!d || !rows) return null;
  return (
    <div className="stack">
      <PageHeader title={`${d.examSubject.subject} · ${d.exam.name}`} subtitle={`Section ${d.section.name} · ${componentsText(comps)} = ${d.examSubject.max} · Pass ${d.examSubject.passMarks} · Deadline ${fmtDate(d.examSubject.deadline, true)}`} actions={<><Badge tone={statusTone(d.status)}>{label(d.status)}</Badge>
        {d.canEdit && <><label className="btn">Import CSV<input type="file" accept=".csv" hidden onChange={importCsv} /></label><Button onClick={() => save(true).then((ok) => ok && sheet.reload())}>Save draft</Button><Button variant="primary" loading={busy} onClick={submit}>Submit for approval</Button></>}</>} />
      {d.returnReason && <div className="alert">↩ Returned for correction: {d.returnReason}</div>}
      {!d.canEdit && <div className="alert info">{d.status === 'published' ? 'These marks are published. Changes need a formal correction from the school admin.' : 'Marks are locked while they are under review.'}</div>}
      <Card flush>
        <div className="table-wrap"><table><thead><tr><th>Roll</th><th>Student</th>{comps.map((c) => <th key={c.key}>{c.label} /{c.max}</th>)}<th>Total /{d.examSubject.max}</th><th>Absent</th><th>Exempt</th><th>Remarks</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.studentId} style={invalid(r) ? { background: 'var(--red-50)' } : undefined}><td>{String(r.rollNo).padStart(2, '0')}</td><td><b>{r.name}</b></td>
              {comps.map((c) => <td key={c.key}><Input type="number" min="0" max={c.max} step="0.5" style={{ width: 90 }} disabled={!d.canEdit || r.absent || r.exempt} aria-label={`${c.label} marks for ${r.name}`} value={r.values?.[c.key] ?? ''} onChange={(e) => setVal(r, c.key, e.target.value === '' ? '' : Number(e.target.value))} /></td>)}
              <td><b>{r.absent ? 'AB' : r.exempt ? 'EX' : total(r)}</b></td>
              <td><input type="checkbox" disabled={!d.canEdit} checked={r.absent} aria-label={`Absent ${r.name}`} onChange={(e) => edit(r.studentId, { absent: e.target.checked, exempt: false })} /></td><td><input type="checkbox" disabled={!d.canEdit} checked={r.exempt} aria-label={`Exempt ${r.name}`} onChange={(e) => edit(r.studentId, { exempt: e.target.checked, absent: false })} /></td>
              <td><Input disabled={!d.canEdit} value={r.remarks || ''} onChange={(e) => edit(r.studentId, { remarks: e.target.value })} /></td></tr>))}</tbody></table></div>
        <div className="card-b small muted">{saved ? `Auto-saved at ${saved.toLocaleTimeString()}` : d.canEdit ? 'Changes are saved automatically.' : ''} {rows.some(invalid) && <span style={{ color: 'var(--red)' }}> Some marks are outside the allowed range and will not be saved.</span>}</div>
      </Card>
      {d.revisions.length > 0 && <Card title="Submission history" flush><DataTable rows={d.revisions} rowKey="version" columns={[{ label: 'Version', key: 'version' }, { label: 'Submitted', render: (r) => fmtDateTime(r.submittedAt) }, { label: 'Returned', render: (r) => fmtDateTime(r.returnedAt) }, { label: 'Reason', key: 'returnReason' }]} /></Card>}
      <div><Link to="/teacher/exams">← Back to examinations</Link></div>
    </div>
  );
}

// ───────────── Performance (class-wise) ─────────────
export function Performance() {
  const classes = useApi(`${T}/classes`);
  const [tab, setTab] = useState('class');
  const [sectionId, setSectionId] = useState('');
  const sid = sectionId || (classes.data?.find((c) => c.isClassTeacher) || classes.data?.[0])?.sectionId || ''; // default to their own class
  const matrix = useApi(sid && tab === 'class' ? `${T}/performance/class/${sid}` : null);
  const analytics = useApi(tab === 'analytics' ? `${T}/performance` : null);
  const nav = useNavigate();
  const mine = classes.data?.find((c) => c.sectionId === sid);
  const [sort, setSort] = useState({ by: 'roll', dir: 'asc' }); const [show, setShow] = useState('all');
  /** Like sorting a spreadsheet: roll number, name, average, or any one exam's marks; ascending or descending; and a quick filter. */
  const arrange = (students) => {
    const pick = (st) => (sort.by === 'roll' ? st.rollNo : sort.by === 'name' ? String(st.name).toLowerCase() : sort.by === 'average' ? st.average : st.scores[sort.by]?.percentage);
    const kept = students.filter((st) => (show === 'all' ? true : show === 'support' ? st.average != null && st.average < 40 : show === 'top' ? st.average != null && st.average >= 75 : show === 'failed' ? Object.values(st.scores).some((c) => c?.result === 'fail') : true));
    return [...kept].sort((a, b) => { const x = pick(a); const y = pick(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; const c = typeof x === 'string' ? x.localeCompare(y) : x - y; return sort.dir === 'asc' ? c : -c; });
  };
  return (
    <div className="stack">
      <PageHeader title="Student performance" subtitle="Published results only. Click a student to see every exam and every mark field." actions={tab === 'class' && <Select value={sid} onChange={(e) => setSectionId(e.target.value)} options={(classes.data || []).map((c) => ({ value: c.sectionId, label: `${c.className} ${c.section}` }))} aria-label="Class" />} />
      <Tabs tabs={[['class', 'Class results'], ['analytics', 'Charts & insights']]} value={tab} onChange={setTab} />
      {tab === 'class' && <Async state={matrix} empty={null}>{(m) => !m.exams.length ? <Empty title="No published results for this class yet">Results appear here once the school admin publishes them.</Empty> : (
        <Card title={`${mine?.className || ''} ${mine?.section || ''} — ${m.scope === 'overall' ? 'overall results (you are the class teacher)' : 'your subject only'}`} flush>
          <div className="card-b row wrap">
            <Select aria-label="Sort by" value={sort.by} onChange={(e) => setSort({ ...sort, by: e.target.value })} options={[{ value: 'roll', label: 'Sort: roll number' }, { value: 'name', label: 'Sort: name (A–Z)' }, { value: 'average', label: 'Sort: average marks' }, ...m.exams.map((e) => ({ value: e.id, label: `Sort: ${e.name}` }))]} />
            <Select aria-label="Order" value={sort.dir} onChange={(e) => setSort({ ...sort, dir: e.target.value })} options={[{ value: 'asc', label: 'Ascending (low to high, A to Z)' }, { value: 'desc', label: 'Descending (high to low, Z to A)' }]} />
            <Select aria-label="Show" value={show} onChange={(e) => setShow(e.target.value)} options={[{ value: 'all', label: 'Show: every student' }, { value: 'top', label: 'Show: 75% and above' }, { value: 'support', label: 'Show: below 40% (needs support)' }, { value: 'failed', label: 'Show: failed in any exam' }]} />
            <span className="muted small">{arrange(m.students).length} of {m.students.length} students</span>
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Roll</th><th>Student</th>{m.exams.map((e) => <th key={e.id}>{e.name}<div className="small muted" style={{ textTransform: 'none', fontWeight: 400 }}>{label(e.type)}{e.date ? ` · ${fmtDate(e.date)}` : ''}</div></th>)}<th>Average</th></tr></thead>
            <tbody>{arrange(m.students).map((s) => (
              <tr key={s.studentId} className="clickable" onClick={() => nav(`/teacher/students/${s.studentId}`)}><td>{String(s.rollNo).padStart(2, '0')}</td><td><b>{s.name}</b> {!s.active && <Badge>left section</Badge>}</td>
                {m.exams.map((e) => { const c = s.scores[e.id]; return <td key={e.id}>{c ? <><b>{c.percentage != null ? `${c.percentage}%` : '—'}</b> <span className="muted small">{c.grade || ''}</span><div className="small" style={{ color: c.result === 'fail' ? 'var(--red)' : 'var(--muted)' }}>{c.obtained}/{c.max}</div></> : <span className="muted">—</span>}</td>; })}
                <td><b>{s.average != null ? `${s.average}%` : '—'}</b></td></tr>))}</tbody></table></div>
        </Card>)}</Async>}
      {tab === 'analytics' && <Async state={analytics}>{(d) => d.sampleSize === 0 ? <Empty title="No published results yet" /> : (
        <div className="stack">
          <div className="grid g2"><Card title="Average marks by examination"><BarsChart data={d.averageByExam} x="exam" bars={[{ key: 'average', name: 'Average %' }]} domain={[0, 100]} unit="%" /></Card>
            <Card title="Performance distribution"><BarsChart data={d.distribution} x="range" bars={[{ key: 'count', name: 'Students', color: 'rgb(var(--c-primary))' }]} /></Card></div>
          <div className="grid g2"><Card title="Subject-wise score trend"><TrendChart data={[...new Set(d.subjectTrend.flatMap((s) => s.points.map((x) => x.exam)))].map((exam) => ({ exam, ...Object.fromEntries(d.subjectTrend.map((s) => [s.subject, s.points.find((x) => x.exam === exam)?.average ?? null])) }))} x="exam" lines={d.subjectTrend.map((s) => ({ key: s.subject }))} /></Card>
            {d.attendanceVsPerformance && <Card title="Attendance vs academic performance"><ScatterPlot data={d.attendanceVsPerformance} x="attendance" y="average" xLabel="Attendance %" yLabel="Average %" /></Card>}</div>
          <Card title="Students who may need support" flush><DataTable rows={d.needsAttention} rowKey="studentId" empty="No one flagged 🎉" columns={[{ label: 'Student', render: (s) => <Link to={`/teacher/students/${s.studentId}`}>{s.name}</Link> }, { label: 'Average', render: (s) => fmtPct(s.average) }, { label: 'Attendance', render: (s) => fmtPct(s.attendance) }]} /><div className="card-b small muted">Private to you. Flagged when the average is close to the pass mark or attendance is below 75%.</div></Card>
        </div>)}</Async>}
    </div>
  );
}

// ───────────── Leave ─────────────
export function Leave() {
  const l = useApi(`${T}/leave`);
  const [modal, setModal] = useState(false); const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Leave management" subtitle="Leave is approved by the school administrator" actions={<Button variant="primary" onClick={() => setModal(true)}>+ Apply for leave</Button>} />
      <Async state={l}>{(d) => (<>
        <div className="grid g4">{Object.entries(d.balances).filter(([, b]) => b.allowance > 0).map(([k, b]) => <Stat key={k} value={b.remaining} label={`${label(k)} leave left`} sub={`${b.used} used of ${b.allowance}${b.granted ? ` (${b.granted} extra from the school)` : ''}`} />)}</div>
        {d.grants?.length > 0 && <Card title="Extra leave given to me this year" flush><DataTable rows={d.grants} rowKey="_id" columns={[{ label: 'Type', render: (g) => label(g.leaveType) }, { label: 'Days', key: 'days' }, { label: 'Reason', key: 'reason' }, { label: 'Given on', render: (g) => fmtDate(g.createdAt, true) }]} /></Card>}
        <Card title="My applications" flush><DataTable rows={d.applications} empty="No applications yet" columns={[{ label: 'Type', render: (x) => label(x.leaveType) }, { label: 'From', render: (x) => fmtDate(x.startDate, true) }, { label: 'To', render: (x) => fmtDate(x.endDate, true) }, { label: 'Days', render: daysText }, { label: 'Reason', key: 'reason' }, { label: 'Status', render: (x) => <Badge tone={statusTone(x.status)}>{label(x.status)}</Badge> }, { label: 'Remarks', key: 'decisionRemark' },
          { label: '', render: (x) => ['draft', 'submitted', 'approved'].includes(x.status) && <ConfirmButton size="sm" message="Cancel this leave application?" onConfirm={async () => { await run(() => post(`${T}/leave/${x._id}/cancel`), 'Cancelled'); l.reload(); }}>Cancel</ConfirmButton> }]} /></Card></>)}</Async>
      {modal && <FormModal title="Apply for leave" fields={leaveFields({ typeHint: 'Unpaid leave is deducted from your salary for those days.' })}
        onClose={() => setModal(false)} onSubmit={async (v) => { await post(`${T}/leave`, leavePayload(v)); l.reload(); return true; }} />}
    </div>
  );
}

// ───────────── Profile ─────────────
export function Profile() {
  const p = useApi(`${T}/profile`);
  return (
    <Async state={p}>{(t) => (
      <div className="stack" style={{ maxWidth: 800 }}>
        <PageHeader title="My profile" actions={<PhotoUpload path={`${T}/profile/photo`} upload={upload} label={t.photoFileId ? 'Change photo' : 'Add a photo'} onDone={p.reload} />} />
        <Card><div className="row" style={{ marginBottom: 14 }}><Avatar fileId={t.photoFileId} name={t.name} size={84} /><div className="small muted">A passport-size or any clear photo. The school office can also add it for you.</div></div><dl className="kv"><dt>Name</dt><dd>{t.name}</dd><dt>Employee id</dt><dd>{t.employeeId}</dd><dt>School</dt><dd>{t.school}</dd><dt>Designation</dt><dd>{t.designation || '—'}</dd><dt>Qualification</dt><dd>{t.qualification || '—'}</dd><dt>Subjects</dt><dd>{t.subjects.map((s) => s.name).join(', ') || '—'}</dd><dt>Email</dt><dd>{t.email || '—'}</dd><dt>Phone</dt><dd>{t.phone || '—'}</dd><dt>Address</dt><dd>{t.address || '—'}</dd><dt>Login id</dt><dd>{t.account?.loginId}</dd></dl>
          <p className="small muted" style={{ marginTop: 10 }}>Your details (name, id, designation, phone, address) are kept by the school office. If something is wrong, ask the school administrator to change it.</p></Card>
      </div>)}</Async>
  );
}
