import ResetPasswordButton from '../../components/ResetPassword.jsx';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi, useForm } from '../../hooks/useApi.js';
import { useLookups } from '../../hooks/useLookups.js';
import { useHouseOptions, useRankOptions } from '../../hooks/useRegistry.js';
import { get, post, put, patch, del, upload, openFile } from '../../api/client.js';
import {
  Async, Badge, Button, Card, ConfirmButton, CredentialsModal, DataTable, Field, Input, Modal, PageHeader, Select, Tabs, useAction, useDebounced, statusTone, fmtDate, fmtMoney, label, Empty,
} from '../../components/ui.jsx';
import { TeacherSummary, ClassesPanel as TeacherClasses, AttendancePanel as TeacherAttendance, SalaryPanel as TeacherSalary, LibraryPanel as TeacherLibrary } from '../../components/TeacherOverview.jsx';
import { SummaryStrip, AttendancePanel, ExamsPanel, HomeworkPanel, FeesPanel, LibraryPanel, BusCard } from '../../components/StudentOverview.jsx';
import FormModal from '../../components/FormModal.jsx';
import StudentPrivacy from '../../components/StudentPrivacy.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import FilterMenu from '../../components/FilterMenu.jsx';
import { gradeRank } from '../../utils/grades.js';
import { Avatar, PhotoUpload } from '../../components/FileImage.jsx';
import { FilterBar, ListCard, ListFooter, useDialogs } from '../../design/ui';

function AdmitStudent({ L, onClose, onDone }) {
  const houses = useHouseOptions();
  const f = useForm({ name: '', dob: '', gender: '', sectionId: '', admissionNo: '', rollNo: '', phone: '', address: '', house: '', gName: '', gRel: 'Father', gPhone: '', gEmail: '', dType: 'percent', dValue: '', dReason: '' });
  const [run, busy] = useAction();
  const [dup, setDup] = useState(null);
  const v = f.values;
  const preview = useApi(v.sectionId ? '/api/school/students/fee-preview' : null, { sectionId: v.sectionId });
  const fee = preview.data; const tuition = fee?.totals.tuition || 0;
  const dNum = Number(v.dValue);
  const taken = !dNum || !tuition ? 0 : v.dType === 'percent' ? Math.round(tuition * Math.min(dNum, 100)) / 100 : Math.min(dNum, tuition);
  const dBad = v.dValue !== '' && (!(dNum > 0) || (v.dType === 'percent' && dNum > 100) || (v.dType === 'amount' && dNum > tuition) || v.dReason.trim().length < 3);
  const submit = async (confirmDuplicate) => {
    const body = {
      name: v.name, dob: v.dob, gender: v.gender, sectionId: v.sectionId, admissionNo: v.admissionNo || undefined, rollNo: v.rollNo ? Number(v.rollNo) : undefined, phone: v.phone || undefined, address: v.address || undefined, house: v.house || undefined,
      guardians: [{ name: v.gName, relationship: v.gRel, phone: v.gPhone, email: v.gEmail || undefined, isPrimary: true }], confirmDuplicate,
      ...(v.dValue !== '' ? { discount: { type: v.dType, value: dNum, reason: v.dReason.trim() } } : {}),
    };
    try { const out = await post('/api/school/students', body); onDone(out); }
    catch (e) { if (e.details?.code === 'DUPLICATE_IDENTITY') setDup(e.message); else run(async () => { throw e; }); }
  };
  return (
    <Modal wide title="Admit a student" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button>
      <Button variant="primary" loading={busy} disabled={!v.name || !v.dob || !v.sectionId || !v.gName || !v.gPhone || !/\S+@\S+\.\S+/.test(v.gEmail) || dBad} onClick={() => submit(false)}>Admit student</Button></>}>
      <div className="form-grid">
        <Field label="Full name"><Input {...f.bind('name')} /></Field><Field label="Date of birth"><Input type="date" {...f.bind('dob')} /></Field>
        <Field label="Class & section" hint="A student appears on a register only once enrolled in a section"><Select {...f.bind('sectionId')} options={L.sectionOptions} placeholder="Select section" /></Field>
        <Field label="Gender"><Select {...f.bind('gender')} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} placeholder="—" /></Field>
        <Field label="Admission number" hint="Leave blank to auto-generate from the school format"><Input {...f.bind('admissionNo')} /></Field><Field label="Roll number" hint="Blank = next available"><Input type="number" min="1" {...f.bind('rollNo')} /></Field>
        <Field label="Phone"><Input {...f.bind('phone')} /></Field><Field label="House" hint={houses.options.length ? undefined : 'Add the school\'s houses first (People → Houses)'}><Select {...f.bind('house')} options={houses.options} placeholder="No house" /></Field><Field label="Address" full><Input {...f.bind('address')} /></Field>
        <div className="full"><h3>Guardian</h3></div>
        <Field label="Guardian name"><Input {...f.bind('gName')} /></Field><Field label="Relationship"><Input {...f.bind('gRel')} /></Field>
        <Field label="Guardian mobile number"><Input {...f.bind('gPhone')} /></Field><Field label="Guardian email" hint="Required: sign-in codes and password resets for the family go here"><Input type="email" {...f.bind('gEmail')} /></Field>
        {v.sectionId && (
          <div className="full stack-sm">
            <h3>Fees</h3>
            {!fee && <p className="muted small" style={{ margin: 0 }}>Loading the fee structure…</p>}
            {fee && !fee.structures.length && <p className="muted small" style={{ margin: 0 }}>This class has no fee structure yet, so the student will not be billed and no discount can be given. Ask Finance to set one up first. Fees are collected at the Finance desk.</p>}
            {fee && fee.structures.length > 0 && (<>
              <dl className="kv">
                {fee.totals.admission > 0 && <><dt>Admission fee (once)</dt><dd>{fmtMoney(fee.totals.admission)}</dd></>}
                <dt>Tuition ({fee.months} month{fee.months === 1 ? '' : 's'}){fee.structures.length === 1 ? ` at ${fmtMoney(fee.structures[0].monthlyFee)} a month` : ''}</dt><dd>{fmtMoney(tuition)}</dd>
                {fee.totals.extras > 0 && <><dt>Other fees</dt><dd>{fmtMoney(fee.totals.extras)}</dd></>}
                {taken > 0 && <><dt>Personal discount on tuition</dt><dd>− {fmtMoney(taken)}</dd></>}
                <dt><b>Total to be billed</b></dt><dd><b>{fmtMoney(fee.totals.total - taken)}</b></dd>
              </dl>
              {tuition > 0 && (
                <div className="form-grid">
                  <Field label="Personal discount on tuition (optional)" hint="Spread evenly over every month and visible to Finance. Admission and other fees are not discounted.">
                    <div className="row"><Select value={v.dType} onChange={(e) => f.set('dType', e.target.value)} options={[{ value: 'percent', label: '% of tuition' }, { value: 'amount', label: '₹ amount' }]} aria-label="Discount type" />
                      <Input type="number" min="0" step="any" aria-label="Discount value" placeholder={v.dType === 'percent' ? 'e.g. 10' : 'e.g. 500'} value={v.dValue} onChange={(e) => f.set('dValue', e.target.value)} /></div></Field>
                  <Field label={`Reason${v.dValue !== '' ? ' (required)' : ''}`}><Input aria-label="Discount reason" placeholder="e.g. Staff child, sibling, scholarship" value={v.dReason} onChange={(e) => f.set('dReason', e.target.value)} /></Field>
                  {v.dValue !== '' && dBad && <div className="small full" role="alert" style={{ color: 'var(--danger-ink, #b3261e)' }}>{!(dNum > 0) ? 'Enter a discount above zero.' : v.dType === 'percent' && dNum > 100 ? 'A percentage cannot be above 100.' : v.dType === 'amount' && dNum > tuition ? `The discount cannot be more than the tuition of ${fmtMoney(tuition)}.` : 'Give a reason for the discount.'}</div>}
                </div>)}
              <p className="muted small" style={{ margin: 0 }}>Fees are billed now; the money is collected at the Finance desk.</p>
            </>)}
          </div>)}
      </div>
      {dup && <div className="alert" style={{ marginTop: 14 }}>{dup} <Button size="sm" onClick={() => { setDup(null); submit(true); }}>Admit anyway</Button></div>}
    </Modal>
  );
}

/** One change for every student the current filter shows (up to 200): their house, or a move to another section. */
function BulkChange({ L, filter, total, ids, onClose, onDone }) {
  const houses = useHouseOptions();
  const [action, setAction] = useState('house'); const [house, setHouse] = useState(''); const [to, setTo] = useState(''); const [reason, setReason] = useState('');
  const [run, busy] = useAction(); const [result, setResult] = useState(null);
  const n = ids ? ids.length : Math.min(total, 200);
  const ok = action === 'house' ? house !== '' : to && reason.trim().length >= 3;
  const go = async () => {
    let studentIds = ids;
    if (!studentIds) {
      const all = await run(() => get('/api/school/students', { ...filter, page: 1, limit: 200 }));
      if (!all) return;
      studentIds = all.items.map((s) => s._id);
    }
    const body = action === 'house' ? { action, studentIds, house: house === '__none__' ? '' : house } : { action, studentIds, toSectionId: to, reason: reason.trim() };
    const r = await run(() => post('/api/school/students/bulk', body), (x) => `Changed ${x.done} of ${x.requested}`);
    if (r) { setResult(r); onDone(); }
  };
  return (
    <Modal wide title="Change many students at once" onClose={onClose} footer={<><Button onClick={onClose}>{result ? 'Close' : 'Cancel'}</Button>{!result && <Button variant="primary" loading={busy} disabled={!ok} onClick={go}>Apply to {n} student{n === 1 ? '' : 's'}</Button>}</>}>
      <div className="stack">
        <div className="alert info">{ids ? `This changes the ${n} student${n === 1 ? '' : 's'} you ticked.` : <>This changes the {n} student{n === 1 ? '' : 's'} the list is showing now{total > 200 ? ` (the first 200 of ${total}; narrow the filter to reach the rest)` : ''}. Use the section and status filters first to pick exactly who.</>}</div>
        {!result && <><Field label="What to change"><Select value={action} onChange={(e) => setAction(e.target.value)} options={[{ value: 'house', label: 'Set their house' }, { value: 'transfer', label: 'Move them to another section' }]} /></Field>
          {action === 'house' ? <Field label="House" hint="Only the school's own houses (People → Houses)."><Select value={house} onChange={(e) => setHouse(e.target.value)} options={[...houses.options, { value: '__none__', label: 'No house (take them out of their house)' }]} placeholder="Choose a house" /></Field>
            : <div className="form-grid"><Field label="New section"><Select value={to} onChange={(e) => setTo(e.target.value)} options={L.sectionOptions} placeholder="Choose a section" /></Field><Field label="Reason (recorded)"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Re-balancing the sections" /></Field></div>}</>}
        {result && <><div className="alert ok">Changed {result.done} of {result.requested} students.</div>{result.failed.length > 0 && <Card title={`${result.failed.length} could not be changed`} flush><DataTable rows={result.failed} rowKey="studentId" columns={[{ label: 'Student', render: (f) => f.name || f.studentId }, { label: 'Why not', key: 'error' }]} /></Card>}</>}
      </div>
    </Modal>
  );
}

/** A round badge with the student's initials. */
const Initials = ({ name, size = 36 }) => <span aria-hidden="true" className="av-chip" style={{ width: size, height: size, fontSize: size > 48 ? 21 : 12.5 }}>{(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>;

/** A student seen without leaving the list: the facts the office needs most, and a way into the full profile. */
function StudentPreview({ s, year, onClose }) {
  const g = s.guardians?.[0];
  const e = s.enrolment;
  return (
    <aside className="stu-preview" aria-label={`${s.name}, preview`}>
      <div className="row" style={{ justifyContent: 'space-between' }}><Badge tone="blue">Preview</Badge><Button size="sm" onClick={onClose} aria-label="Close preview">Close</Button></div>
      <div className="stu-preview-top"><Initials name={s.name} size={64} /><h3>{s.name}</h3><span className="muted small">{e ? `${e.className} ${e.section}` : 'Not enrolled'} · {s.admissionNo}</span></div>
      <dl className="stu-facts">
        <div><dt>Status</dt><dd><Badge tone={statusTone(s.status)}>{label(s.status)}</Badge></dd></div>
        <div><dt>Roll number</dt><dd>{e?.rollNo ?? '—'}</dd></div>
        {e?.yearName && year && e.yearName !== year && <div><dt>Year</dt><dd>{e.yearName}</dd></div>}
        <div><dt>Guardian</dt><dd>{g?.name || '—'}</dd></div>
        <div><dt>Phone</dt><dd>{g?.phone ? <a href={`tel:${g.phone}`}>{g.phone}</a> : '—'}</dd></div>
      </dl>
      <Link to={`/admin/students/${s._id}`} className="btn primary stu-open">Open full profile</Link>
    </aside>
  );
}

export function Students() {
  const L = useLookups(undefined, { openYears: true });
  const [q, setQ] = useState(''); const [sectionId, setSectionId] = useState(''); const [status, setStatus] = useState('active'); const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useApi('/api/school/students', { q: dq, sectionId, status, page, limit: 25 });
  const [admit, setAdmit] = useState(false);
  const [creds, setCreds] = useState(null);
  const [bulk, setBulk] = useState(false);
  const [sel, setSel] = useState(null); // the student shown in the preview panel
  const [picked, setPicked] = useState({}); // ticked rows
  const ids = Object.keys(picked).filter((k) => picked[k]);
  const current = list.data?.items?.find((x) => x._id === sel) || null;
  return (
    <div className="stack">
      <PageHeader title="Students" subtitle="Admissions create the student, the section enrolment and the login together" actions={<><Button onClick={() => setBulk(true)} disabled={!list.data?.total}>Change many at once</Button><Button variant="primary" onClick={() => setAdmit(true)} disabled={!L.sectionOptions.length}>+ Admit student</Button></>} />
      <div className={`stu-split${current ? ' open' : ''}`}>
        <ListCard>
          <FilterBar search={q} onSearch={(v) => { setQ(v); setPage(1); }} searchLabel="Search students" placeholder="Search name, admission no, guardian">
            <Select value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPage(1); }} options={L.sectionOptions} placeholder="All sections" aria-label="Section" />
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={['active', 'withdrawn', 'transferred_out', 'completed', 'archived'].map((s) => ({ value: s, label: label(s) }))} aria-label="Status" />
          </FilterBar>
          {ids.length > 0 && (
            <div className="stu-bulk" role="status"><b>{ids.length} selected</b><Button size="sm" onClick={() => setBulk(true)}>Change house or section</Button><Button size="sm" onClick={() => setPicked({})} style={{ marginLeft: 'auto' }}>Clear</Button></div>
          )}
          <Async state={list}>{(d) => (<>
            <DataTable rows={d.items} empty="No students match" onRowClick={(s) => setSel((c) => (c === s._id ? null : s._id))} rowClassName={(s) => (s._id === sel ? 'sel' : '')} columns={[
              { label: '', render: (s) => <input type="checkbox" className="chk" aria-label={`Select ${s.name}`} checked={!!picked[s._id]} onChange={(e) => setPicked((p) => ({ ...p, [s._id]: e.target.checked }))} /> },
              { label: 'Student', sort: (s) => s.name, render: (s) => <div className="row" style={{ gap: 12 }}><Initials name={s.name} /><div><b>{s.name}</b><div className="small muted">{s.admissionNo}</div></div></div> },
              { label: 'Class', render: (s) => s.enrolment ? <>{s.enrolment.className} {s.enrolment.section}{s.enrolment.yearName && list.data?.year?.name && s.enrolment.yearName !== list.data.year.name && <div className="small muted">in {s.enrolment.yearName}</div>}</> : <Badge>Not enrolled</Badge> },
              { label: 'Guardian', render: (s) => <div>{s.guardians?.[0]?.name}<div className="small muted">{s.guardians?.[0]?.phone}</div></div> },
              { label: 'Status', render: (s) => <Badge tone={statusTone(s.status)}>{label(s.status)}</Badge> },
            ]} />
            <ListFooter total={d.total} noun="student" page={page} pageSize={25} onPage={setPage} /></>)}</Async>
        </ListCard>
        {current && <StudentPreview s={current} year={list.data?.year?.name} onClose={() => setSel(null)} />}
      </div>
      {bulk && <BulkChange L={L} filter={{ q: dq, sectionId, status }} total={list.data?.total || 0} ids={ids.length ? ids : undefined} onClose={() => setBulk(false)} onDone={() => { list.reload(); setPicked({}); }} />}
      {admit && <AdmitStudent L={L} onClose={() => setAdmit(false)} onDone={(o) => { setAdmit(false); list.reload(); setCreds(o.credentials); }} />}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} title="Student admitted" />
    </div>
  );
}

export function StudentDetail() {
  const dlg = useDialogs();
  const { user } = useAuth();
  const houses = useHouseOptions();
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState('profile');
  const s = useApi(`/api/school/students/${id}`);
  const docs = useApi(tab === 'documents' ? `/api/school/students/${id}/documents` : null);
  const ov = useApi(`/api/school/students/${id}/overview`);
  const L = useLookups();
  const [run, busy] = useAction();
  const [modal, setModal] = useState(null);
  const [creds, setCreds] = useState(null);
  const fileRef = useRef(); const docType = useRef('birth_certificate');
  return (
    <Async state={s}>{(st) => {
      const active = st.enrolments.find((e) => e.status === 'active');
      return (
        <div className="stack">
          <div className="row"><Avatar fileId={st.photoFileId} name={st.name} size={72} /><PhotoUpload path={`/api/school/students/${id}/photo`} upload={upload} label={st.photoFileId ? 'Change photo' : 'Add a photo'} onDone={s.reload} /></div>
          <PageHeader title={st.name} subtitle={`Admission no ${st.admissionNo} · ${active ? `${active.className} ${active.section}, roll ${active.rollNo}` : 'No active enrolment'}`} actions={<>
            <Button onClick={() => setModal('edit')}>Edit</Button>
            {st.status === 'active' && <><Button onClick={() => setModal('transfer')} disabled={!active}>Move section</Button><Button variant="danger" onClick={() => setModal('withdraw')}>Withdraw</Button></>}
            {st.status !== 'active' && st.status !== 'archived' && <Button onClick={async () => { await run(() => post(`/api/school/students/${id}/reactivate`), 'Reactivated'); s.reload(); }}>Reactivate</Button>}
            <ResetPasswordButton size="md" url={`/api/school/students/${id}/reset-password`} name={st.name} onDone={setCreds} /></>} />
          <Async state={ov}>{(o) => <SummaryStrip o={o} />}</Async>
          <Tabs tabs={[['profile', 'Profile'], ['attendance', 'Attendance'], ['exams', 'Exams & marks'], ['homework', 'Homework'], ['fees', 'Fees'], ['library', 'Library'], ['transport', 'Bus'], ['history', 'Enrolment history'], ['documents', 'Documents'], ...(user?.adminLevel === 'sub' ? [] : [['privacy', 'Privacy']])]} value={tab} onChange={setTab} />
          {['attendance', 'exams', 'homework', 'fees', 'library', 'transport'].includes(tab) && <Async state={ov}>{(o) => (
            tab === 'attendance' ? <AttendancePanel o={o} /> : tab === 'exams' ? <ExamsPanel o={o} /> : tab === 'homework' ? <HomeworkPanel o={o} /> : tab === 'fees' ? <FeesPanel studentId={id} /> : tab === 'library' ? <LibraryPanel o={o} /> : <BusCard bus={o.bus} />)}</Async>}
          {tab === 'profile' && (
            <div className="grid g2">
              <Card title="Personal"><dl className="kv"><dt>Date of birth</dt><dd>{fmtDate(st.dob, true)}</dd><dt>Gender</dt><dd>{label(st.gender) || '—'}</dd><dt>Phone</dt><dd>{st.phone || '—'}</dd><dt>Address</dt><dd>{st.address || '—'}</dd><dt>House</dt><dd>{st.house || '—'}</dd><dt>Status</dt><dd><Badge tone={statusTone(st.status)}>{label(st.status)}</Badge></dd></dl></Card>
              <Card title="Guardians & account">
                {st.guardians.map((g, i) => <div key={i} className="stack-sm" style={{ marginBottom: 8 }}><b>{g.name}</b> <span className="muted">({g.relationship})</span><div className="small">{g.phone} {g.email && `· ${g.email}`}</div></div>)}
                <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />
                <dl className="kv"><dt>Login id</dt><dd>{st.account?.loginId}</dd><dt>Last sign-in</dt><dd>{st.account?.lastLoginAt ? new Date(st.account.lastLoginAt).toLocaleString() : 'Never'}</dd></dl>
              </Card>
            </div>)}
          {tab === 'privacy' && <StudentPrivacy studentId={id} name={st.name} onErased={s.reload} />}
          {tab === 'history' && (<div className="stack">
            <Card title="Academic enrolments" flush><DataTable rows={st.enrolments} columns={[{ label: 'Year', key: 'year' }, { label: 'Class', key: 'className' }, { label: 'Section', key: 'section' }, { label: 'Roll', key: 'rollNo' }, { label: 'From', render: (e) => fmtDate(e.startDate, true) }, { label: 'To', render: (e) => fmtDate(e.endDate, true) }, { label: 'Status', render: (e) => <Badge tone={statusTone(e.status)}>{label(e.status)}</Badge> },
              { label: '', render: (e) => (['promoted', 'retained', 'completed'].includes(e.status) ? <ConfirmButton size="sm" message={`Put ${st.name} back in ${e.className} ${e.section} of ${e.year}? Allowed only while nothing has been recorded for them in the new year.`} onConfirm={async () => { if (await run(() => post('/api/school/promotions/undo', { enrolmentId: e._id }), 'Put back in their class')) { s.reload(); ov.reload(); } }}>Put back</ConfirmButton> : null) }]} /></Card>
            <Card title="Section transfers" flush><DataTable rows={st.transfers} empty="No transfers" columns={[{ label: 'Effective', render: (t) => fmtDate(t.effectiveDate, true) }, { label: 'From', key: 'fromSection' }, { label: 'To', key: 'toSection' }, { label: 'Reason', key: 'reason' }]} /></Card></div>)}
          {tab === 'documents' && (
            <Card title="Documents (private to the school and this student)" action={<div className="row">
              <select aria-label="Document type" defaultValue="birth_certificate" onChange={(e) => { docType.current = e.target.value; }} style={{ width: 190 }}>{['birth_certificate', 'transfer_certificate', 'admission_form', 'report_card', 'other'].map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>
              <input type="file" hidden ref={fileRef} onChange={async (e) => { const file = e.target.files[0]; if (!file) return; const fd = new FormData(); fd.append('docType', docType.current); fd.append('file', file); await run(() => upload(`/api/school/students/${id}/documents`, fd), 'Uploaded'); e.target.value = ''; docs.reload(); }} />
              <Button size="sm" variant="primary" loading={busy} onClick={() => fileRef.current.click()}>Upload</Button></div>} flush>
              <Async state={docs} empty={<Empty title="No documents uploaded" />}>{(rows) => <DataTable rows={rows} rowKey="id" columns={[{ label: 'Name', key: 'name' }, { label: 'Type', render: (d) => label(d.type) }, { label: 'Uploaded', render: (d) => fmtDate(d.uploadedAt, true) }, { label: '', render: (d) => <div className="row"><Button size="sm" onClick={() => run(() => openFile(d.id))}>Open</Button><ConfirmButton size="sm" variant="danger" message="Delete this document?" onConfirm={async () => { await run(() => del(`/api/school/documents/${d.id}`), 'Deleted'); docs.reload(); }}>Delete</ConfirmButton></div> }]} />}</Async></Card>)}
          {modal === 'edit' && <FormModal wide title="Edit student" initial={st} fields={[{ name: 'name', label: 'Name', required: true }, { name: 'admissionNo', label: 'Admission number', required: true }, { name: 'dob', label: 'Date of birth', type: 'date', required: true }, { name: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'other'] }, { name: 'phone', label: 'Phone' }, { name: 'house', label: 'House', type: 'select', options: houses.options }, { name: 'address', label: 'Address' }]}
            onClose={() => setModal(null)} onSubmit={async (v) => { await patch(`/api/school/students/${id}`, { ...v, guardians: st.guardians }); s.reload(); return true; }} />}
          {modal === 'transfer' && <FormModal title="Move to another section" submitLabel="Move student" fields={[{ name: 'toSectionId', label: 'New section', type: 'select', required: true, options: L.sectionOptions.filter((o) => o.value !== active?.sectionId) }, { name: 'effectiveDate', label: 'Effective from', type: 'date' }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
            onClose={() => setModal(null)} onSubmit={async (v) => { await post(`/api/school/students/${id}/transfer`, v); s.reload(); return true; }}><p className="small muted" style={{ marginTop: 12 }}>Earlier attendance, marks and report cards stay with the previous section and are not changed.</p></FormModal>}
          {modal === 'withdraw' && <FormModal title="Withdraw student" submitLabel="Withdraw" fields={[{ name: 'outcome', label: 'Outcome', type: 'select', options: [{ value: 'withdrawn', label: 'Withdrawn' }, { value: 'transferred_out', label: 'Transferred to another school' }], default: 'withdrawn', required: true }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }, { name: 'date', label: 'Effective date', type: 'date' }]}
            onClose={() => setModal(null)} onSubmit={async (v) => {
              try { await post(`/api/school/students/${id}/withdraw`, v); } catch (e) {
                if (e.details?.code !== 'CLEARANCE_REQUIRED') throw e;
                const parts = [e.details.openLoans?.length ? `library books not returned: ${e.details.openLoans.map((l) => l.book).join(', ')}` : null, e.details.pendingDues > 0 ? `unpaid fees: ₹${e.details.pendingDues}` : null].filter(Boolean).join('\n');
                if (!(await dlg.confirm(`This student is not cleared:\n${parts}\n\nWithdraw anyway? The dues stay on record with Finance.`, { title: 'Withdraw anyway?', confirmLabel: 'Withdraw anyway', danger: true }))) return false;
                await post(`/api/school/students/${id}/withdraw`, { ...v, overrideClearance: true });
              }
              s.reload(); return true; }}><p className="small muted" style={{ marginTop: 12 }}>The student's records are kept and their login is disabled. Library books and unpaid fees are checked first.</p></FormModal>}
          <CredentialsModal creds={creds} onClose={() => setCreds(null)} title="Password reset" />
          <div><Button variant="ghost" onClick={() => nav('/admin/students')}>← Back to students</Button></div>
        </div>);
    }}</Async>
  );
}

const teacherFields = (ranks = [], houses = []) => [
  { name: 'name', label: 'Full name', required: true }, { name: 'employeeId', label: 'Employee id', required: true }, { name: 'email', label: 'Email', type: 'email', required: true, hint: 'Sign-in codes and password resets are sent here. Used as the login id.' }, { name: 'phone', label: 'Mobile number', required: true }, { name: 'dob', label: 'Date of birth', type: 'date', required: true, hint: 'Asked when a forgotten password is reset' },
  { name: 'designation', label: 'Designation', type: 'select', options: ranks, hint: 'Only designations the school has registered (People → Designations)' }, { name: 'house', label: 'House (mentors its students)', type: 'select', options: houses }, { name: 'qualification', label: 'Qualification' }, { name: 'joiningDate', label: 'Joining date', type: 'date' }, { name: 'address', label: 'Address' },
  { name: 'bankName', label: 'Bank name' }, { name: 'accountName', label: 'Name on the account' }, { name: 'accountNo', label: 'Account number', hint: 'Salary is paid here' }, { name: 'ifsc', label: 'IFSC code', placeholder: 'HDFC0001234' },
  { name: 'uan', label: 'UAN (for PF)', placeholder: '12 digits' }, { name: 'esiNo', label: 'ESI number' }, { name: 'pan', label: 'PAN', placeholder: 'ABCDE1234F' },
  { name: 'subjectsText', label: 'Subjects they teach', hint: 'Type subject names separated by commas, e.g. Mathematics, Physics. New subjects are created automatically.', full: true },
];
/** The form is flat; the API wants bank and statutory details as groups. */
const nestPerson = ({ bankName, accountName, accountNo, ifsc, uan, esiNo, pan, ...rest }) => {
  const pick = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));
  const bank = pick({ bankName, accountName, accountNo, ifsc }); const statutory = pick({ uan, esiNo, pan });
  return { ...rest, ...(Object.keys(bank).length ? { bank } : {}), ...(Object.keys(statutory).length ? { statutory } : {}) };
};
const splitSubjects = (t) => String(t || '').split(',').map((x) => x.trim()).filter(Boolean);

export function Teachers() {
  const nav = useNavigate();
  const ranks = useRankOptions(); const houses = useHouseOptions();
  const [q, setQ] = useState(''); const [status, setStatus] = useState('active');
  const dq = useDebounced(q);
  const list = useApi('/api/school/teachers', { q: dq, status, limit: 100 });
  const [modal, setModal] = useState(false); const [creds, setCreds] = useState(null);
  return (
    <div className="stack">
      <PageHeader title="Teachers" subtitle="Teacher profiles and logins. Subjects and sections are assigned under Teacher assignments." actions={<Button variant="primary" onClick={() => setModal(true)}>+ Add teacher</Button>} />
      <ListCard>
        <FilterBar search={q} onSearch={setQ} searchLabel="Search teachers" placeholder="Search name, employee id, email">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} aria-label="Status" /></FilterBar>
        <Async state={list}>{(d) => <DataTable rows={d.items} empty="No teachers yet" onRowClick={(t) => nav(`/admin/teachers/${t._id}`)} columns={[
          { label: 'Emp. id', key: 'employeeId' }, { label: 'Name', render: (t) => <b>{t.name}</b> }, { label: 'Subjects', render: (t) => (t.subjectIds || []).map((s) => s.name).join(', ') || '—' }, { label: 'Login', render: (t) => t.account?.loginId }, { label: 'Phone', key: 'phone' }, { label: 'Status', render: (t) => <Badge tone={statusTone(t.status)}>{t.status}</Badge> }]} />}</Async>
      </ListCard>
      {modal && <FormModal wide title="Add teacher" fields={teacherFields(ranks.options, houses.options)} onClose={() => setModal(false)}
        onSubmit={async (v) => { const { subjectsText, ...rest } = v; const out = await post('/api/school/teachers', { ...nestPerson(rest), subjects: splitSubjects(subjectsText) }); list.reload(); setCreds(out.credentials); return true; }} />}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} title="Teacher created" />
    </div>
  );
}

export function TeacherDetail() {
  const dlg = useDialogs();
  const ranks = useRankOptions(); const houses = useHouseOptions();
  const { id } = useParams();
  const t = useApi(`/api/school/teachers/${id}`);
  const tt = useApi('/api/school/timetable/entries', { teacherId: id });
  const ov = useApi(`/api/school/teachers/${id}/overview`);
  const [tab, setTab] = useState('profile');
  const [run] = useAction();
  const [modal, setModal] = useState(false); const [creds, setCreds] = useState(null);
  return (
    <Async state={t}>{(x) => (
      <div className="stack">
        <div className="row"><Avatar fileId={x.photoFileId} name={x.name} size={72} /><PhotoUpload path={`/api/school/teachers/${id}/photo`} upload={upload} label={x.photoFileId ? 'Change photo' : 'Add a photo'} onDone={t.reload} /></div>
        <PageHeader title={x.name} subtitle={`${x.designation || 'Teacher'} · Employee ${x.employeeId}`} actions={<>
          <Button onClick={() => setModal(true)}>Edit</Button>
          <ResetPasswordButton size="md" url={`/api/school/teachers/${id}/reset-password`} name={x.name} onDone={setCreds} />
          {x.status === 'active' ? <ConfirmButton variant="danger" message="Deactivate this teacher? Their login is disabled and all open assignments end today. Past records stay with them." onConfirm={async () => {
            let r;
            try { r = await post(`/api/school/teachers/${id}/deactivate`, {}); } catch (e) {
              if (e.details?.code === 'CLEARANCE_REQUIRED' && (await dlg.confirm(`${e.message}\n\nBooks still out: ${e.details.openLoans.map((l) => l.book).join(', ')}\n\nDeactivate anyway?`))) r = await run(() => post(`/api/school/teachers/${id}/deactivate`, { overrideClearance: true }));
              else { await run(async () => { throw e; }); return; }
            }
            if (r) { alert(r.unresolvedPeriods ? `Teacher deactivated. ${r.unresolvedPeriods} timetable period(s) now need a new teacher.` : 'Teacher deactivated'); t.reload(); }
          }}>Deactivate</ConfirmButton>
            : <Button onClick={async () => { await run(() => post(`/api/school/teachers/${id}/reactivate`), 'Reactivated'); t.reload(); }}>Reactivate</Button>}</>} />
        <Async state={ov}>{(o) => <TeacherSummary o={o} />}</Async>
        <Tabs tabs={[['profile', 'Profile'], ['classes', 'Classes & results'], ['attendance', 'Attendance & leave'], ['salary', 'Salary & payslips'], ['library', 'Library']]} value={tab} onChange={setTab} />
        {['classes', 'attendance', 'salary', 'library'].includes(tab) && <Async state={ov}>{(o) => (tab === 'classes' ? <TeacherClasses o={o} /> : tab === 'attendance' ? <TeacherAttendance o={o} /> : tab === 'salary' ? <TeacherSalary o={o} /> : <TeacherLibrary o={o} />)}</Async>}
        {tab === 'profile' && <>
        <div className="grid g2">
          <Card title="Profile"><dl className="kv"><dt>Email</dt><dd>{x.email || '—'}</dd><dt>Phone</dt><dd>{x.phone || '—'}</dd><dt>Qualification</dt><dd>{x.qualification || '—'}</dd><dt>Joined</dt><dd>{fmtDate(x.joiningDate, true)}</dd><dt>Subjects</dt><dd>{x.subjectIds.map((s) => s.name).join(', ') || '—'}</dd><dt>Login id</dt><dd>{x.account?.loginId}</dd><dt>Status</dt><dd><Badge tone={statusTone(x.status)}>{x.status}</Badge></dd></dl></Card>
          <Card title="Class teacher of"><Async state={ov}>{(o) => (o.classTeacherOf.length ? o.classTeacherOf.map((c) => <Link key={c.sectionId} to={`/admin/classes/${c.sectionId}`}><Badge tone="primary">{c.className} {c.section} · {c.students} students</Badge></Link>) : <span className="muted">Not a class teacher</span>)}</Async></Card>
        </div>
        <Card title="Teaching assignments" flush><DataTable rows={x.assignments} empty="No assignments" columns={[{ label: 'Class', render: (a) => `${a.classId?.name} ${a.sectionId?.name}` }, { label: 'Subject', render: (a) => a.subjectId?.name }, { label: 'From', render: (a) => fmtDate(a.effectiveFrom, true) }, { label: 'Until', render: (a) => (a.effectiveTo ? fmtDate(a.effectiveTo, true) : 'Ongoing') }, { label: 'State', render: (a) => <Badge tone={a.open ? 'green' : ''}>{a.open ? 'Active' : 'Ended'}</Badge> }]} /></Card>
        <Card title="Weekly timetable load" flush><Async state={tt} empty={<div className="empty">No timetable periods</div>}>{(rows) => <div className="card-b"><b>{rows.length}</b> periods per week across {new Set(rows.map((r) => r.sectionId)).size} section(s).</div>}</Async></Card>
        </>}
        {modal && <FormModal wide title="Edit teacher" initial={{ ...x, bankName: x.bank?.bankName, accountName: x.bank?.accountName, accountNo: x.bank?.accountNo, ifsc: x.bank?.ifsc, uan: x.statutory?.uan, esiNo: x.statutory?.esiNo, pan: x.statutory?.pan, subjectsText: x.subjectIds.map((s) => s.name).join(', ') }} fields={teacherFields(ranks.options, houses.options)} onClose={() => setModal(false)} onSubmit={async (v) => { const { subjectsText, ...rest } = v; await patch(`/api/school/teachers/${id}`, { ...nestPerson(rest), subjects: splitSubjects(subjectsText) }); t.reload(); return true; }} />}
        <CredentialsModal creds={creds} onClose={() => setCreds(null)} title="Password reset" />
      </div>)}</Async>
  );
}

const byClassSectionSubject = (a, b) => gradeRank(a.classId?.name) - gradeRank(b.classId?.name) || String(a.sectionId?.name).localeCompare(String(b.sectionId?.name)) || String(a.subjectId?.name).localeCompare(String(b.subjectId?.name));
const uniq = (rows, pick) => [...new Map(rows.map((r) => [pick(r)?.id, pick(r)]).filter(([id]) => id)).values()];

export function Assignments() {
  const L = useLookups();
  const yid = L.currentYear?._id; // the current session only; earlier sessions are under "Past sessions"
  const asg = useApi(yid ? '/api/school/teaching-assignments' : null, { yearId: yid, open: 'true' });
  const cts = useApi(yid ? '/api/school/class-teachers' : null, { yearId: yid });
  const [modal, setModal] = useState(null);
  const [run] = useAction();
  const ctBySection = new Map((cts.data || []).filter((c) => c.open).map((c) => [c.sectionId?._id, c]));
  // filters: the choices always come from the whole list, so choosing one never hides the others
  const [fl, setFl] = useState({ q: '', classId: '', sectionId: '', subjectId: '', teacherId: '' });
  const setF = (patch) => setFl((x) => ({ ...x, ...patch }));
  const dq = useDebounced(fl.q);
  const everything = [...(asg.data || [])].sort(byClassSectionSubject);
  const classChoices = uniq(everything, (a) => (a.classId ? { id: a.classId._id, name: a.classId.name } : null)).sort((a, b) => gradeRank(a.name) - gradeRank(b.name));
  const sectionChoices = uniq(everything.filter((a) => !fl.classId || a.classId?._id === fl.classId), (a) => (a.sectionId ? { id: a.sectionId._id, name: `${a.classId?.name} ${a.sectionId.name}` } : null));
  const subjectChoices = uniq(everything, (a) => (a.subjectId ? { id: a.subjectId._id, name: a.subjectId.name } : null)).sort((a, b) => a.name.localeCompare(b.name));
  const teacherChoices = uniq(everything, (a) => (a.teacherId ? { id: a.teacherId._id, name: a.teacherId.name } : null)).sort((a, b) => a.name.localeCompare(b.name));
  const rows = everything.filter((a) => (!fl.classId || a.classId?._id === fl.classId) && (!fl.sectionId || a.sectionId?._id === fl.sectionId) && (!fl.subjectId || a.subjectId?._id === fl.subjectId) && (!fl.teacherId || a.teacherId?._id === fl.teacherId)
    && (!dq || `${a.subjectId?.name} ${a.teacherId?.name} ${a.classId?.name} ${a.sectionId?.name}`.toLowerCase().includes(dq.toLowerCase())));
  const filtered = Object.values(fl).some(Boolean);
  const sectionRows = L.sections.filter((x) => x.yearId === yid && x.status === 'active' && (!fl.classId || x.classId === fl.classId)).sort((x, y) => gradeRank(L.sectionName(x._id)) - gradeRank(L.sectionName(y._id)) || L.sectionName(x._id).localeCompare(L.sectionName(y._id), undefined, { numeric: true }));
  const subjectNames = L.subjects.filter((x) => x.status === 'active').map((x) => x.name);
  return (
    <div className="stack">
      <PageHeader title="Subjects & teacher assignments" subtitle="Who teaches which subject in which section. Subjects are created here, through the teacher — there is no separate subject list to maintain." actions={<>
        <Button variant="primary" onClick={() => setModal('asg')}>+ Assign teacher to a subject</Button></>} />
      <Card>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <Field label="Search"><Input aria-label="Search assignments" placeholder="Teacher, subject or class" value={fl.q} onChange={(e) => setF({ q: e.target.value })} /></Field>
          <FilterMenu count={[fl.classId, fl.sectionId, fl.subjectId, fl.teacherId].filter(Boolean).length} onClear={() => setFl({ q: fl.q, classId: '', sectionId: '', subjectId: '', teacherId: '' })}>
            <Field label="Class"><Select aria-label="Class" value={fl.classId} onChange={(e) => setF({ classId: e.target.value, sectionId: '' })} placeholder="All classes" options={classChoices.map((c) => ({ value: c.id, label: c.name }))} /></Field>
            <Field label="Section"><Select aria-label="Section" value={fl.sectionId} onChange={(e) => setF({ sectionId: e.target.value })} placeholder="All sections" options={sectionChoices.map((c) => ({ value: c.id, label: c.name }))} /></Field>
            <Field label="Subject"><Select aria-label="Subject" value={fl.subjectId} onChange={(e) => setF({ subjectId: e.target.value })} placeholder="All subjects" options={subjectChoices.map((c) => ({ value: c.id, label: c.name }))} /></Field>
            <Field label="Teacher"><Select aria-label="Teacher" value={fl.teacherId} onChange={(e) => setF({ teacherId: e.target.value })} placeholder="All teachers" options={teacherChoices.map((c) => ({ value: c.id, label: c.name }))} /></Field>
          </FilterMenu>
        </div>
      </Card>
      <Card title={`Subject teachers${asg.data ? ` (${rows.length}${filtered ? ` of ${everything.length}` : ''})` : ''}`} flush><Async state={asg} empty={<div className="empty">No assignments yet. Assign a teacher to a subject in a section to begin.</div>}>{() => rows.length ? <DataTable rows={rows} columns={[
        { label: 'Class', sort: (a) => gradeRank(a.classId?.name) * 1000 + String(a.sectionId?.name).charCodeAt(0), render: (a) => `${a.classId?.name} ${a.sectionId?.name}` }, { label: 'Subject', sort: (a) => a.subjectId?.name, render: (a) => <b>{a.subjectId?.name}</b> }, { label: 'Teacher', sort: (a) => a.teacherId?.name, render: (a) => a.teacherId?.name }, { label: 'Periods / week', sort: (a) => a.offeringId?.weeklyPeriods ?? 0, render: (a) => a.offeringId?.weeklyPeriods ?? '—' }, { label: 'Since', sort: (a) => a.effectiveFrom || '', render: (a) => fmtDate(a.effectiveFrom, true) },
        { label: '', render: (a) => <div className="row"><Button size="sm" onClick={() => setModal({ periods: a })}>Periods</Button><ConfirmButton size="sm" message="End this assignment today? Future timetable periods will need a new teacher." onConfirm={async () => { const r = await run(() => post(`/api/school/teaching-assignments/${a._id}/end`), 'Assignment ended'); if (r?.unresolvedPeriods) alert(`${r.unresolvedPeriods} timetable period(s) are now unresolved.`); asg.reload(); }}>End</ConfirmButton></div> },
      ]} /> : <Empty title="No assignments match">Try clearing a filter.</Empty>}</Async></Card>
      <Card title="Class teachers (the only teachers who take a section's attendance)" flush><DataTable rows={sectionRows} empty="No sections" columns={[
        { label: 'Section', render: (s) => <b>{L.sectionName(s._id)}</b> }, { label: 'Class teacher', render: (s) => ctBySection.get(s._id)?.teacherId?.name || <span className="muted">Not assigned — nobody can take attendance</span> },
        { label: '', render: (s) => <div className="row"><Button size="sm" onClick={() => setModal({ ct: s })}>{ctBySection.has(s._id) ? 'Change' : 'Assign'}</Button>
          {ctBySection.has(s._id) && <ConfirmButton size="sm" message="Remove class teacher?" onConfirm={async () => { await run(() => del(`/api/school/sections/${s._id}/class-teacher`), 'Removed'); cts.reload(); }}>Remove</ConfirmButton>}</div> },
      ]} /></Card>
      {modal === 'asg' && <FormModal title="Assign teacher to a subject" fields={[{ name: 'teacherId', label: 'Teacher', type: 'select', options: L.teacherOptions, required: true }, { name: 'sectionId', label: 'Section', type: 'select', options: L.sectionOptions, required: true },
        { name: 'subject', label: 'Subject', required: true, list: 'subject-names', hint: 'Pick an existing subject or type a new one, e.g. Mathematics' }, { name: 'weeklyPeriods', label: 'Periods per week', type: 'number', min: 1, default: 5 }, { name: 'effectiveFrom', label: 'Effective from', type: 'date' }]}
        onClose={() => setModal(null)} onSubmit={async (v) => { await post('/api/school/teaching-assignments', v); asg.reload(); L.reload(); return true; }}><datalist id="subject-names">{subjectNames.map((n) => <option key={n} value={n} />)}</datalist></FormModal>}
      {modal?.periods && <FormModal title={`Periods per week · ${modal.periods.subjectId?.name} ${modal.periods.classId?.name}`} initial={{ weeklyPeriods: modal.periods.offeringId?.weeklyPeriods }} fields={[{ name: 'weeklyPeriods', label: 'Periods per week', type: 'number', min: 1, required: true }]}
        onClose={() => setModal(null)} onSubmit={async (v) => { await patch(`/api/school/offerings/${modal.periods.offeringId._id}`, v); asg.reload(); return true; }} />}
      {modal?.ct && <FormModal title={`Class teacher · ${L.sectionName(modal.ct._id)}`} fields={[{ name: 'teacherId', label: 'Teacher', type: 'select', options: L.teacherOptions, required: true }, { name: 'effectiveFrom', label: 'Effective from', type: 'date' }]}
        onClose={() => setModal(null)} onSubmit={async (v) => { await put(`/api/school/sections/${modal.ct._id}/class-teacher`, v); cts.reload(); return true; }} />}
    </div>
  );
}
