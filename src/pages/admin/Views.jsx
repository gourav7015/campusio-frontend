import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { post, patch } from '../../api/client.js';
import FormModal from '../../components/FormModal.jsx';
import { Async, Badge, Button, Card, CredentialsModal, DataTable, Empty, Field, Input, Modal, PageHeader, Select, Tabs, useAction, fmtDateTime, statusTone, label } from '../../components/ui.jsx';
import { Expenses, Budgets } from '../finance/FinanceMore.jsx';
import { FinanceDashboard, FeeStructures, FeePolicy, StudentsDues, Payments, FinanceReports, FinanceDefaulters } from '../finance/Finance.jsx';
import { LibraryDashboard, Books, Loans } from '../library/Library.jsx';
import ClassBorrowers from '../../components/ClassBorrowers.jsx';
import TransportDashboard from '../transport/TransportDashboard';
import Buses from '../transport/Buses.jsx';
import TransportStaff from '../transport/TransportStaff.jsx';
import TransportAttendance from '../transport/Attendance.jsx';
import TransportLeave from '../transport/Leave.jsx';

/** School Admin's view-only window onto Finance. Money is handled by the Finance desk. */
export function AdminFees() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'overview';
  return (
    <div className="stack">
      <Tabs tabs={[['overview', 'Overview'], ['structures', 'Fee structures'], ['policy', 'Fee policy'], ['students', 'Students & dues'], ['payments', 'Payments'], ['defaulters', 'Defaulters'], ['reports', 'Reports'], ['expenses', 'Expenditure'], ['budgets', 'Budgets']]} value={tab} onChange={(t) => setSp({ tab: t })} />
      {tab === 'overview' && <FinanceDashboard readOnly />}{tab === 'structures' && <FeeStructures readOnly />}{tab === 'policy' && <FeePolicy readOnly />}{tab === 'students' && <StudentsDues readOnly />}{tab === 'payments' && <Payments readOnly />}{tab === 'expenses' && <Expenses readOnly />}{tab === 'budgets' && <Budgets readOnly />}{tab === 'defaulters' && <FinanceDefaulters readOnly />}{tab === 'reports' && <FinanceReports readOnly />}
    </div>
  );
}

export function AdminLibrary() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'overview';
  return (
    <div className="stack">
      <Tabs tabs={[['overview', 'Overview'], ['books', 'Catalogue'], ['loans', 'Loans and Overdue'], ['classes', 'By class']]} value={tab} onChange={(t) => setSp({ tab: t })} />
      {tab === 'overview' && <LibraryDashboard readOnly />}{tab === 'books' && <Books readOnly />}{tab === 'loans' && <Loans readOnly />}{tab === 'classes' && <ClassBorrowers base="/api/school/library" />}
    </div>
  );
}

/** School Admin's view-only window onto Transport. The Transport officer adds buses, crew and riders. */
export function AdminTransport() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'overview';
  const base = '/api/school/transport';
  return (
    <div className="stack">
      <Tabs tabs={[['overview', 'Overview'], ['buses', 'Buses & riders'], ['staff', 'Drivers & staff'], ['attendance', 'Staff attendance'], ['leave', 'Staff leave']]} value={tab} onChange={(t) => setSp({ tab: t })} />
      {tab === 'overview' && <TransportDashboard base={base} />}{tab === 'buses' && <Buses base={base} readOnly />}{tab === 'staff' && <TransportStaff base={base} readOnly />}{tab === 'attendance' && <TransportAttendance base={base} readOnly />}{tab === 'leave' && <TransportLeave base={base} readOnly />}
    </div>
  );
}

const DESKS = [{ value: 'finance', label: 'Finance (fees & receipts)' }, { value: 'library', label: 'Library (books & loans)' }, { value: 'transport', label: 'Transport (buses, drivers & riders)' }, { value: 'staff', label: 'Office desk (Staff portal: attendance, leave, employee list, teachers\' queries)' }];

/** One dialog for every kind of login. An officer needs an email; a staff member for the office desk needs a job title). */
function AddLoginModal({ onClose, onCreated, initialRole = '' }) {
  const [f, setF] = useState({ role: initialRole, name: '', email: '', designationId: '', phone: '', holder: '' });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const staff = f.role === 'staff';
  const titles = useApi(staff ? '/api/school/designations' : null);
  const desk = !!f.role && !staff; // an officer role: held by a person
  const people = useApi(desk ? '/api/school/support-staff' : null, { status: 'active', limit: 200 });
  const free = (people.data?.items || []).filter((p) => !p.hasLogin);
  const [run, busy] = useAction();
  const ok = f.role && (staff ? f.name.trim().length >= 2 && f.designationId : (f.holder || f.name.trim().length >= 2) && /\S+@\S+\.\S+/.test(f.email));
  const save = async () => {
    const body = staff ? { role: 'staff', name: f.name.trim(), designationId: f.designationId, ...(f.phone ? { phone: f.phone } : {})} : { role: f.role, email: f.email, ...(f.holder ? { staffMemberId: f.holder } : { name: f.name.trim(), ...(f.phone ? { phone: f.phone } : {}) }) };
    const r = await run(() => post('/api/school/staff', body));
    if (r) { onCreated(r); onClose(); }
  };
  return (
    <Modal title="Add a login" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!ok} onClick={save}>Save</Button></>}>
      <div className="form-grid">
        <Field label="Portal" full><Select value={f.role} onChange={(e) => set('role', e.target.value)} placeholder="Select…" options={DESKS} /></Field>
        {desk && <Field label="Who holds this role?" full hint="A role is held by a person. Choose someone already on the staff list, or add a new person."><Select value={f.holder} onChange={(e) => set('holder', e.target.value)} options={[{ value: '', label: 'A new person' }, ...free.map((p) => ({ value: p._id, label: `${p.name} (${p.staffId} · ${p.designation})` }))]} /></Field>}
        {!(desk && f.holder) && <Field label={desk ? "New person's full name" : 'Full name'}><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>}
        {desk && !f.holder && <Field label="Phone"><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>}
        {staff ? <>
          <Field label="Job title" hint="Only the school's registered jobs. Add more under People → Designations."><Select value={f.designationId} onChange={(e) => set('designationId', e.target.value)} placeholder="Choose" options={(titles.data || []).filter((d) => d.status === 'active').map((d) => ({ value: d._id, label: d.name }))} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          
        </> : <Field label="Email (login id)"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>}
      </div>
      {staff && <p className="muted small" style={{ marginTop: 10 }}>The login id and a starting password are shown once you save. The starting password follows your school's format (first letters of the name plus date of birth) when a date of birth is on file, otherwise it is generated. The person then appears under Employees › Non-teaching staff.</p>}
    </Modal>
  );
}

const SUBPORTALS = [
  { role: 'finance', name: 'Finance', title: 'Finance Officer', what: 'fees, receipts, expenses' }, { role: 'library', name: 'Library', title: 'Librarian', what: 'books and loans' },
  { role: 'transport', name: 'Transport', title: 'Transport Officer', what: 'buses, drivers and riders' }, { role: 'staff', name: 'Office desk', title: 'Office staff', what: 'attendance, leave, queries' },
];
/** Which sub-portals are open, with the rank behind each and who is in charge of it now. */
function PortalTiles({ rows, onOpen }) {
  const open = SUBPORTALS.filter((p) => rows.some((r) => r.role === p.role && r.status === 'active')).length;
  return (
    <Card title={`Sub-portals: ${open} of ${SUBPORTALS.length} open`}>
      <div className="grid g4">{SUBPORTALS.map((p) => {
        const who = rows.filter((r) => r.role === p.role && r.status === 'active');
        return (
          <div key={p.role} className="card" style={{ padding: 14 }}>
            <div className="row between" style={{ alignItems: 'center' }}><b>{p.name}</b><Badge tone={who.length ? 'green' : 'amber'}>{who.length ? 'Open' : 'Not opened'}</Badge></div>
            <div className="muted small">{p.what}</div>
            <div style={{ marginTop: 10 }}>{who.length ? <><div className="muted small">{p.role === 'staff' ? `In charge (${who.length})` : 'In charge'}</div><b>{who[0].name}</b>{who.length > 1 && <span className="muted small"> +{who.length - 1} more</span>}<div className="small muted">{who[0].title || p.title}</div></>
              : <Button size="sm" onClick={() => onOpen(p.role)}>+ Open the {p.name.toLowerCase()} portal</Button>}</div>
          </div>);
      })}</div>
    </Card>
  );
}

/** Finance, Library and Transport officers, and Staff portal logins, are created here by the School Admin; those users create nobody. */
export function Staff() {
  const list = useApi('/api/school/staff');
  const [modal, setModal] = useState(false); const [creds, setCreds] = useState(null); const [edit, setEdit] = useState(null); const [role, setRole] = useState('');
  const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Desk logins" subtitle="The sign-ins of the school's sub-portals: Finance, Library and Transport, each held by one officer, and the office desk (Staff portal) for staff who work for the admin. Each officer sees only their own desk." actions={<Button variant="primary" onClick={() => { setRole(''); setModal(true); }}>+ Add sign-in</Button>} />
      <Async state={list}>{(rows) => <PortalTiles rows={rows} onOpen={(r) => { setRole(r); setModal(true); }} />}</Async>
      <Card flush><Async state={list} empty={<Empty title="No staff accounts yet" />}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Person', sort: (u) => u.name, render: (u) => <><b>{u.name}</b><div className="small muted">{[u.code, u.phone].filter(Boolean).join(' · ') || 'No phone on file'}</div></> }, { label: 'Role held', sort: (u) => u.role, render: (u) => <><Badge tone={u.role === 'finance' ? 'green' : u.role === 'transport' ? 'amber' : 'blue'}>{u.title || label(u.role)}</Badge></> }, { label: 'Login id', key: 'loginId' }, { label: 'Last sign-in', render: (u) => fmtDateTime(u.lastLoginAt) }, { label: 'Status', render: (u) => <Badge tone={statusTone(u.status === 'active' ? 'active' : 'rejected')}>{u.status}</Badge> },
        { label: '', render: (u) => <div className="row"><Button size="sm" onClick={() => setEdit(u)}>Edit person</Button><Button size="sm" onClick={async () => { const r = await run(() => post(`/api/school/staff/${u._id}/reset-password`)); if (r) setCreds(r); }}>Reset password</Button><Button size="sm" onClick={async () => { await run(() => patch(`/api/school/staff/${u._id}`, { status: u.status === 'active' ? 'disabled' : 'active' }), 'Updated'); list.reload(); }}>{u.status === 'active' ? 'Disable' : 'Enable'}</Button></div> }]} />}</Async></Card>
      <p className="muted small">A role is held by a person. Use the person's own name here (click Edit person to change a name such as “Accounts Officer” to the real one), or give the role to someone who is already on the staff list.</p>
      {modal && <AddLoginModal initialRole={role} onClose={() => setModal(false)} onCreated={(r) => { list.reload(); setCreds(r); }} />}
      {edit && <FormModal title={`Edit person · ${edit.title || label(edit.role)}`} initial={{ name: edit.name, phone: edit.phone || '' }} fields={[{ name: 'name', label: 'Person\'s name', required: true }, { name: 'phone', label: 'Phone' }]} onClose={() => setEdit(null)} onSubmit={async (v) => { await patch(`/api/school/staff/${edit._id}`, { name: v.name, phone: v.phone || '' }); list.reload(); return true; }} />}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} title="Staff account" />
    </div>
  );
}
