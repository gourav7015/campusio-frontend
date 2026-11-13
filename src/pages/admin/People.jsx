import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi, useForm } from '../../hooks/useApi.js';
import { useLookups } from '../../hooks/useLookups.js';
import { post, put, patch, del, upload, openFile } from '../../api/client.js';
import {
  Async, Badge, Button, Card, ConfirmButton, CredentialsModal, DataTable, Field, Input, Modal, PageHeader, Select, Tabs, useAction, useDebounced, statusTone, fmtDate, label, Empty,
} from '../../components/ui.jsx';
import { TeacherSummary, ClassesPanel as TeacherClasses, AttendancePanel as TeacherAttendance, SalaryPanel as TeacherSalary, LibraryPanel as TeacherLibrary } from '../../components/TeacherOverview.jsx';
import { SummaryStrip, AttendancePanel, ExamsPanel, HomeworkPanel, FeesPanel, LibraryPanel, BusCard } from '../../components/StudentOverview.jsx';
import FormModal from '../../components/FormModal.jsx';
import { FilterBar, ListCard, ListFooter, useDialogs } from '../../design/ui';

function AdmitStudent({ L, onClose, onDone }) {
  const f = useForm({ name: '', dob: '', gender: '', sectionId: '', admissionNo: '', rollNo: '', phone: '', address: '', house: '', gName: '', gRel: 'Father', gPhone: '', gEmail: '' });
  const [run, busy] = useAction();
  const [dup, setDup] = useState(null);
  const v = f.values;
  const submit = async (confirmDuplicate) => {
    const body = {
      name: v.name, dob: v.dob, gender: v.gender, sectionId: v.sectionId, admissionNo: v.admissionNo || undefined, rollNo: v.rollNo ? Number(v.rollNo) : undefined, phone: v.phone || undefined, address: v.address || undefined, house: v.house || undefined,
      guardians: [{ name: v.gName, relationship: v.gRel, phone: v.gPhone, email: v.gEmail || undefined, isPrimary: true }], confirmDuplicate,
    };
    try { const out = await post('/api/school/students', body); onDone(out); }
    catch (e) { if (e.details?.code === 'DUPLICATE_IDENTITY') setDup(e.message); else run(async () => { throw e; }); }
  };
  return (
    <Modal wide title="Admit a student" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button>
      <Button variant="primary" loading={busy} disabled={!v.name || !v.dob || !v.sectionId || !v.gName || !v.gPhone} onClick={() => submit(false)}>Admit student</Button></>}>
      <div className="form-grid">
        <Field label="Full name"><Input {...f.bind('name')} /></Field><Field label="Date of birth"><Input type="date" {...f.bind('dob')} /></Field>
        <Field label="Class & section" hint="A student appears on a register only once enrolled in a section"><Select {...f.bind('sectionId')} options={L.sectionOptions} placeholder="Select section" /></Field>
        <Field label="Gender"><Select {...f.bind('gender')} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} placeholder="—" /></Field>
        <Field label="Admission number" hint="Leave blank to auto-generate from the school format"><Input {...f.bind('admissionNo')} /></Field><Field label="Roll number" hint="Blank = next available"><Input type="number" min="1" {...f.bind('rollNo')} /></Field>
        <Field label="Phone"><Input {...f.bind('phone')} /></Field><Field label="House"><Input {...f.bind('house')} /></Field><Field label="Address" full><Input {...f.bind('address')} /></Field>
        <div className="full"><h3>Guardian</h3></div>
        <Field label="Guardian name"><Input {...f.bind('gName')} /></Field><Field label="Relationship"><Input {...f.bind('gRel')} /></Field>
        <Field label="Guardian phone"><Input {...f.bind('gPhone')} /></Field><Field label="Guardian email"><Input type="email" {...f.bind('gEmail')} /></Field>
      </div>
      {dup && <div className="alert" style={{ marginTop: 14 }}>{dup} <Button size="sm" onClick={() => { setDup(null); submit(true); }}>Admit anyway</Button></div>}
    </Modal>
  );
}

export function Students() {
  const nav = useNavigate();
  const L = useLookups();
  const [q, setQ] = useState(''); const [sectionId, setSectionId] = useState(''); const [status, setStatus] = useState('active'); const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useApi('/api/school/students', { q: dq, sectionId, status, page, limit: 25 });
  const [admit, setAdmit] = useState(false);
  const [creds, setCreds] = useState(null);
  return (
    <div className="stack">
      <PageHeader title="Students" subtitle="Admissions create the student, the section enrolment and the login together" actions={<Button variant="primary" onClick={() => setAdmit(true)} disabled={!L.sectionOptions.length}>+ Admit student</Button>} />
      <ListCard>
        <FilterBar search={q} onSearch={(v) => { setQ(v); setPage(1); }} searchLabel="Search students" placeholder="Search name, admission no, guardian">
          <Select value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPage(1); }} options={L.sectionOptions} placeholder="All sections" aria-label="Section" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={['active', 'withdrawn', 'transferred_out', 'completed', 'archived'].map((s) => ({ value: s, label: label(s) }))} aria-label="Status" />
        </FilterBar>
        <Async state={list}>{(d) => (<>
          <DataTable rows={d.items} empty="No students match" onRowClick={(s) => nav(`/admin/students/${s._id}`)} columns={[
            { label: 'Adm. no', key: 'admissionNo' }, { label: 'Name', render: (s) => <b>{s.name}</b> }, { label: 'Class', render: (s) => s.enrolment ? `${s.enrolment.className} ${s.enrolment.section}` : <Badge>Not enrolled</Badge> },
            { label: 'Roll', render: (s) => s.enrolment?.rollNo ?? '—' }, { label: 'Guardian', render: (s) => s.guardians?.[0]?.name }, { label: 'Phone', render: (s) => s.guardians?.[0]?.phone }, { label: 'Status', render: (s) => <Badge tone={statusTone(s.status)}>{label(s.status)}</Badge> },
          ]} />
          <ListFooter total={d.total} noun="student" page={page} pageSize={25} onPage={setPage} /></>)}</Async>
      </ListCard>
      {admit && <AdmitStudent L={L} onClose={() => setAdmit(false)} onDone={(o) => { setAdmit(false); list.reload(); setCreds(o.credentials); }} />}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} title="Student admitted" />
    </div>
  );
}

export function StudentDetail() {
  const dlg = useDialogs();
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
          <PageHeader title={st.name} subtitle={`Admission no ${st.admissionNo} · ${active ? `${active.className} ${active.section}, roll ${active.rollNo}` : 'No active enrolment'}`} actions={<>
            <Button onClick={() => setModal('edit')}>Edit</Button>
            {st.status === 'active' && <><Button onClick={() => setModal('transfer')} disabled={!active}>Move section</Button><Button variant="danger" onClick={() => setModal('withdraw')}>Withdraw</Button></>}
            {st.status !== 'active' && st.status !== 'archived' && <Button onClick={async () => { await run(() => post(`/api/school/students/${id}/reactivate`), 'Reactivated'); s.reload(); }}>Reactivate</Button>}
            <Button onClick={async () => { const r = await run(() => post(`/api/school/students/${id}/reset-password`)); if (r) setCreds(r); }}>Reset password</Button></>} />
          <Async state={ov}>{(o) => <SummaryStrip o={o} />}</Async>
          <Tabs tabs={[['profile', 'Profile'], ['attendance', 'Attendance'], ['exams', 'Exams & marks'], ['homework', 'Homework'], ['fees', 'Fees'], ['library', 'Library'], ['transport', 'Bus'], ['history', 'Enrolment history'], ['documents', 'Documents']]} value={tab} onChange={setTab} />
          {['attendance', 'exams', 'homework', 'fees', 'library', 'transport'].includes(tab) && <Async state={ov}>{(o) => (
            tab === 'attendance' ? <AttendancePanel o={o} /> : tab === 'exams' ? <ExamsPanel o={o} /> : tab === 'homework' ? <HomeworkPanel o={o} /> : tab === 'fees' ? <FeesPanel o={o} /> : tab === 'library' ? <LibraryPanel o={o} /> : <BusCard bus={o.bus} />)}</Async>}
          {tab === 'profile' && (
            <div className="grid g2">
              <Card title="Personal"><dl className="kv"><dt>Date of birth</dt><dd>{fmtDate(st.dob, true)}</dd><dt>Gender</dt><dd>{label(st.gender) || '—'}</dd><dt>Phone</dt><dd>{st.phone || '—'}</dd><dt>Address</dt><dd>{st.address || '—'}</dd><dt>House</dt><dd>{st.house || '—'}</dd><dt>Status</dt><dd><Badge tone={statusTone(st.status)}>{label(st.status)}</Badge></dd></dl></Card>
              <Card title="Guardians & account">
                {st.guardians.map((g, i) => <div key={i} className="stack-sm" style={{ marginBottom: 8 }}><b>{g.name}</b> <span className="muted">({g.relationship})</span><div className="small">{g.phone} {g.email && `· ${g.email}`}</div></div>)}
                <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />
                <dl className="kv"><dt>Login id</dt><dd>{st.account?.loginId}</dd><dt>Last sign-in</dt><dd>{st.account?.lastLoginAt ? new Date(st.account.lastLoginAt).toLocaleString() : 'Never'}</dd></dl>
              </Card>
            </div>)}
          {tab === 'history' && (<div className="stack">
            <Card title="Academic enrolments" flush><DataTable rows={st.enrolments} columns={[{ label: 'Year', key: 'year' }, { label: 'Class', key: 'className' }, { label: 'Section', key: 'section' }, { label: 'Roll', key: 'rollNo' }, { label: 'From', render: (e) => fmtDate(e.startDate, true) }, { label: 'To', render: (e) => fmtDate(e.endDate, true) }, { label: 'Status', render: (e) => <Badge tone={statusTone(e.status)}>{label(e.status)}</Badge> }]} /></Card>
            <Card title="Section transfers" flush><DataTable rows={st.transfers} empty="No transfers" columns={[{ label: 'Effective', render: (t) => fmtDate(t.effectiveDate, true) }, { label: 'From', key: 'fromSection' }, { label: 'To', key: 'toSection' }, { label: 'Reason', key: 'reason' }]} /></Card></div>)}
          {tab === 'documents' && (
            <Card title="Documents (private to the school and this student)" action={<div className="row">
              <select aria-label="Document type" defaultValue="birth_certificate" onChange={(e) => { docType.current = e.target.value; }} style={{ width: 190 }}>{['birth_certificate', 'transfer_certificate', 'admission_form', 'report_card', 'other'].map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>
              <input type="file" hidden ref={fileRef} onChange={async (e) => { const file = e.target.files[0]; if (!file) return; const fd = new FormData(); fd.append('docType', docType.current); fd.append('file', file); await run(() => upload(`/api/school/students/${id}/documents`, fd), 'Uploaded'); e.target.value = ''; docs.reload(); }} />
              <Button size="sm" variant="primary" loading={busy} onClick={() => fileRef.current.click()}>Upload</Button></div>} flush>
              <Async state={docs} empty={<Empty title="No documents uploaded" />}>{(rows) => <DataTable rows={rows} rowKey="id" columns={[{ label: 'Name', key: 'name' }, { label: 'Type', render: (d) => label(d.type) }, { label: 'Uploaded', render: (d) => fmtDate(d.uploadedAt, true) }, { label: '', render: (d) => <div className="row"><Button size="sm" onClick={() => run(() => openFile(d.id))}>Open</Button><ConfirmButton size="sm" variant="danger" message="Delete this document?" onConfirm={async () => { await run(() => del(`/api/school/documents/${d.id}`), 'Deleted'); docs.reload(); }}>Delete</ConfirmButton></div> }]} />}</Async></Card>)}
          {modal === 'edit' && <FormModal wide title="Edit student" initial={st} fields={[{ name: 'name', label: 'Name', required: true }, { name: 'admissionNo', label: 'Admission number', required: true }, { name: 'dob', label: 'Date of birth', type: 'date', required: true }, { name: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'other'] }, { name: 'phone', label: 'Phone' }, { name: 'house', label: 'House' }, { name: 'address', label: 'Address' }]}
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

const teacherFields = () => [
  { name: 'name', label: 'Full name', required: true }, { name: 'employeeId', label: 'Employee id', required: true }, { name: 'email', label: 'Email', type: 'email', hint: 'Used as the login id if provided' }, { name: 'phone', label: 'Phone' },
  { name: 'designation', label: 'Designation' }, { name: 'qualification', label: 'Qualification' }, { name: 'joiningDate', label: 'Joining date', type: 'date' }, { name: 'address', label: 'Address' },
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
      {modal && <FormModal wide title="Add teacher" fields={teacherFields()} onClose={() => setModal(false)}
        onSubmit={async (v) => { const { subjectsText, ...rest } = v; const out = await post('/api/school/teachers', { ...nestPerson(rest), subjects: splitSubjects(subjectsText) }); list.reload(); setCreds(out.credentials); return true; }} />}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} title="Teacher created" />
    </div>
  );
}

export function TeacherDetail() {
  const dlg = useDialogs();
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
        <PageHeader title={x.name} subtitle={`${x.designation || 'Teacher'} · Employee ${x.employeeId}`} actions={<>
          <Button onClick={() => setModal(true)}>Edit</Button>
          <Button onClick={async () => { const r = await run(() => post(`/api/school/teachers/${id}/reset-password`)); if (r) setCreds(r); }}>Reset password</Button>
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
        {modal && <FormModal wide title="Edit teacher" initial={{ ...x, bankName: x.bank?.bankName, accountName: x.bank?.accountName, accountNo: x.bank?.accountNo, ifsc: x.bank?.ifsc, uan: x.statutory?.uan, esiNo: x.statutory?.esiNo, pan: x.statutory?.pan, subjectsText: x.subjectIds.map((s) => s.name).join(', ') }} fields={teacherFields()} onClose={() => setModal(false)} onSubmit={async (v) => { const { subjectsText, ...rest } = v; await patch(`/api/school/teachers/${id}`, { ...nestPerson(rest), subjects: splitSubjects(subjectsText) }); t.reload(); return true; }} />}
        <CredentialsModal creds={creds} onClose={() => setCreds(null)} title="Password reset" />
      </div>)}</Async>
  );
}

export function Assignments() {
  const L = useLookups();
  const [yearId, setYearId] = useState('');
  const yid = yearId || L.currentYear?._id;
  const asg = useApi(yid ? '/api/school/teaching-assignments' : null, { yearId: yid, open: 'true' });
  const cts = useApi(yid ? '/api/school/class-teachers' : null, { yearId: yid });
  const [modal, setModal] = useState(null);
  const [run] = useAction();
  const ctBySection = new Map((cts.data || []).filter((c) => c.open).map((c) => [c.sectionId?._id, c]));
  const subjectNames = L.subjects.filter((x) => x.status === 'active').map((x) => x.name);
  return (
    <div className="stack">
      <PageHeader title="Subjects & teacher assignments" subtitle="Who teaches which subject in which section. Subjects are created here, through the teacher — there is no separate subject list to maintain." actions={<>
        <Select value={yid || ''} onChange={(e) => setYearId(e.target.value)} options={L.yearOptions} aria-label="Academic year" />
        <Button variant="primary" onClick={() => setModal('asg')}>+ Assign teacher to a subject</Button></>} />
      <Card title="Subject teachers" flush><Async state={asg} empty={<div className="empty">No assignments yet. Assign a teacher to a subject in a section to begin.</div>}>{(rows) => <DataTable rows={rows} columns={[
        { label: 'Class', render: (a) => `${a.classId?.name} ${a.sectionId?.name}` }, { label: 'Subject', render: (a) => <b>{a.subjectId?.name}</b> }, { label: 'Teacher', render: (a) => a.teacherId?.name }, { label: 'Periods / week', render: (a) => a.offeringId?.weeklyPeriods ?? '—' }, { label: 'Since', render: (a) => fmtDate(a.effectiveFrom, true) },
        { label: '', render: (a) => <div className="row"><Button size="sm" onClick={() => setModal({ periods: a })}>Periods</Button><ConfirmButton size="sm" message="End this assignment today? Future timetable periods will need a new teacher." onConfirm={async () => { const r = await run(() => post(`/api/school/teaching-assignments/${a._id}/end`), 'Assignment ended'); if (r?.unresolvedPeriods) alert(`${r.unresolvedPeriods} timetable period(s) are now unresolved.`); asg.reload(); }}>End</ConfirmButton></div> },
      ]} />}</Async></Card>
      <Card title="Class teachers (the only teachers who take a section's attendance)" flush><DataTable rows={L.sections.filter((s) => s.yearId === yid && s.status === 'active')} empty="No sections" columns={[
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
