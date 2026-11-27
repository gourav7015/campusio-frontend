import ResetPasswordButton from '../../components/ResetPassword.jsx';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { post, patch } from '../../api/client.js';
import { Async, Badge, Button, Card, CredentialsModal, DataTable, Empty, Field, Modal, PageHeader, Select, Tabs, useAction, fmtDateTime, statusTone, label } from '../../components/ui.jsx';
import { Expenses, Budgets, VendorsHub, SpendingReceipts } from '../finance/FinanceMore.jsx';
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
      <Tabs tabs={[['overview', 'Overview'], ['structures', 'Fee structures'], ['policy', 'Fee policy'], ['students', 'Students and dues'], ['payments', 'Payments and receipts'], ['defaulters', 'Defaulters'], ['reports', 'Reports'], ['expenses', 'Expenditure'], ['vendors', 'Vendors'], ['spending-receipts', 'Payment vouchers'], ['budgets', 'Budgets']]} value={tab} onChange={(t) => setSp({ tab: t })} />
      {tab === 'overview' && <FinanceDashboard readOnly />}{tab === 'structures' && <FeeStructures readOnly />}{tab === 'policy' && <FeePolicy readOnly />}{tab === 'students' && <StudentsDues readOnly />}{tab === 'payments' && <Payments readOnly />}{tab === 'expenses' && <Expenses readOnly />}{tab === 'budgets' && <Budgets readOnly />}{tab === 'vendors' && <VendorsHub readOnly />}{tab === 'spending-receipts' && <SpendingReceipts readOnly />}{tab === 'defaulters' && <FinanceDefaulters readOnly />}{tab === 'reports' && <FinanceReports readOnly />}
    </div>
  );
}

export function AdminLibrary() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'overview';
  return (
    <div className="stack">
      <Tabs tabs={[['overview', 'Overview'], ['books', 'Catalogue'], ['loans', 'Loans and overdue'], ['classes', 'By class']]} value={tab} onChange={(t) => setSp({ tab: t })} />
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
      <Tabs tabs={[['overview', 'Overview'], ['buses', 'Buses and riders'], ['staff', 'Drivers and staff'], ['attendance', 'Staff attendance'], ['leave', 'Staff leave']]} value={tab} onChange={(t) => setSp({ tab: t })} />
      {tab === 'overview' && <TransportDashboard base={base} />}{tab === 'buses' && <Buses base={base} readOnly />}{tab === 'staff' && <TransportStaff base={base} readOnly />}{tab === 'attendance' && <TransportAttendance base={base} readOnly />}{tab === 'leave' && <TransportLeave base={base} readOnly />}
    </div>
  );
}

const DESKS = [{ value: 'finance', label: 'Finance (fees and receipts)' }, { value: 'library', label: 'Library (books and loans)' }, { value: 'transport', label: 'Transport (buses, drivers and riders)' }, { value: 'staff', label: 'Office desk (Staff portal: attendance, leave, employee list, teachers\' queries)' }];

/** A new desk login: choose the desk, and (if you like) the employee who works it. Its login id is made for it and shown before anything is saved. */
function AddLoginModal({ onClose, onCreated, initialRole = '' }) {
  const [role, setRole] = useState(initialRole); const [holder, setHolder] = useState('');
  const office = role === 'staff';
  const people = useApi(role ? '/api/school/support-staff' : null, { status: 'active', limit: 200 });
  const free = (people.data?.items || []).filter((p) => !p.hasLogin && p.group !== 'transport');
  const preview = useApi(role ? '/api/school/staff/login-preview' : null, { role, staffMemberId: holder });
  const [run, busy] = useAction();
  const ok = role && (!office || holder);
  const save = async () => { const r = await run(() => post('/api/school/staff', { role, ...(holder ? { staffMemberId: holder } : {}) })); if (r) { onCreated(r); onClose(); } };
  const loginId = preview.data?.loginId;
  return (
    <Modal title="Add a desk login" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!ok} onClick={save}>Create login</Button></>}>
      <div className="stack">
        <Field label="Desk" full><Select value={role} onChange={(e) => { setRole(e.target.value); setHolder(''); }} placeholder="Choose a desk" options={DESKS} /></Field>
        {role && (
          <Field label={office ? 'Employee who works the office desk' : 'Employee who runs this desk (optional)'} full hint={office ? 'Someone already on the staff list. They keep their own job title.' : 'You can leave this empty and assign someone later. Drivers and conductors cannot hold a desk.'}>
            <Select value={holder} onChange={(e) => setHolder(e.target.value)} placeholder={office ? 'Choose an employee' : 'Nobody yet'} options={free.map((p) => ({ value: p._id, label: `${p.name} · ${[p.staffId, p.designation].filter(Boolean).join(' · ')}` }))} />
          </Field>
        )}
        {role && (
          <div className="box" style={{ padding: 12 }}>
            <div className="small muted">Login id for this desk</div>
            <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 18, fontWeight: 700, margin: '2px 0' }} aria-live="polite" data-testid="login-id-preview">{loginId || (office ? 'Choose the employee to see it' : '…')}</div>
            <div className="small muted">Made for you from the school code and the desk. A starting password is made too and shown once, after you press Create login: copy it then. The desk signs in on its own portal page.</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

const DESK_NAME = { finance: 'Finance desk', library: 'Library desk', transport: 'Transport desk', staff: 'Office desk' };
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
            <div style={{ marginTop: 10 }}>{who.length ? <><div className="muted small">{p.role === 'staff' ? `In charge (${who.length})` : 'In charge'}</div><b>{who[0].personName || who[0].name}</b>{who.length > 1 && <span className="muted small"> +{who.length - 1} more</span>}<div className="small muted">{who[0].title || p.title}</div></>
              : <Button size="sm" onClick={() => onOpen(p.role)}>+ Open the {p.name.toLowerCase()} portal</Button>}</div>
          </div>);
      })}</div>
    </Card>
  );
}

/** Finance, Library and Transport officers, and Staff portal logins, are created here by the School Admin; those users create nobody. */
export function Staff() {
  const list = useApi('/api/school/staff');
  const [modal, setModal] = useState(false); const [creds, setCreds] = useState(null); const [assign, setAssign] = useState(null); const [role, setRole] = useState('');
  const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Desk logins" subtitle="The sign-ins of the school's sub-portals: Finance, Library and Transport, each held by one officer, and the office desk (Staff portal) for staff who work for the admin. Each officer sees only their own desk." actions={<Button variant="primary" onClick={() => { setRole(''); setModal(true); }}>+ Add sign-in</Button>} />
      <Async state={list}>{(rows) => <PortalTiles rows={rows} onOpen={(r) => { setRole(r); setModal(true); }} />}</Async>
      <Card flush><Async skeleton="datatable" state={list} empty={<Empty title="No desk logins yet" />}>{(rows) => <DataTable rows={rows} columns={[
        { label: 'Desk', sort: (u) => u.role, render: (u) => <><Badge tone={u.role === 'finance' ? 'green' : u.role === 'transport' ? 'amber' : 'blue'}>{DESK_NAME[u.role] || label(u.role)}</Badge><div className="small muted">Login id: {u.loginId}</div></> },
        { label: 'Held by', sort: (u) => u.personName || u.name, render: (u) => (!u.assigned
          ? <><span className="muted">Nobody assigned yet</span><div className="small muted">Give this desk to someone on the staff list</div></>
          : <><b>{u.personName || u.name}</b><div className="small muted">{[u.title, u.code, u.phone].filter(Boolean).join(' · ') || 'No details on file'}</div></>) },
        { label: 'Last sign-in', render: (u) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(u.lastLoginAt)}</span> },
        { label: 'Status', render: (u) => <Badge tone={statusTone(u.status === 'active' ? 'active' : 'rejected')}>{u.status}</Badge> },
        { label: '', render: (u) => <div className="row" style={{ gap: 6, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
          <Button size="sm" onClick={() => setAssign(u)} style={{ whiteSpace: 'nowrap' }}>{u.assigned ? 'Change employee' : 'Assign employee'}</Button>
          <ResetPasswordButton url={`/api/school/staff/${u._id}/reset-password`} name={u.personName || u.name} onDone={setCreds} />
          <Button size="sm" onClick={async () => { await run(() => patch(`/api/school/staff/${u._id}`, { status: u.status === 'active' ? 'disabled' : 'active' }), 'Updated'); list.reload(); }}>{u.status === 'active' ? 'Disable' : 'Enable'}</Button></div> },
      ]} />}</Async></Card>
      <p className="muted small">A desk login is the desk's sign-in (login id and password). The person it belongs to is an employee: press Assign employee to give a desk to someone already on the staff list, and Change employee when it passes to someone else. They sign in with the desk's login. If a password was not copied when the login was made, press Reset password for a new one.</p>
      {modal && <AddLoginModal initialRole={role} onClose={() => setModal(false)} onCreated={(r) => { list.reload(); setCreds(r); }} />}
      {assign && <AssignEmployee desk={assign} onClose={() => setAssign(null)} onDone={() => { setAssign(null); list.reload(); }} />}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} title="Staff account" />
    </div>
  );
}

/** Gives an officer desk (Finance, Library or Transport) to an employee who is already on the staff list. The sign-in stays the desk's. */
function AssignEmployee({ desk, onClose, onDone }) {
  const people = useApi('/api/school/support-staff', { status: 'active', limit: 200 });
  const free = (people.data?.items || []).filter((p) => !p.hasLogin && p.group !== 'transport');
  const [pick, setPick] = useState('');
  const [run, busy] = useAction();
  const save = async () => { const r = await run(() => post(`/api/school/staff/${desk._id}/assign`, { staffMemberId: pick }), `${free.find((p) => p._id === pick)?.name || 'The employee'} now holds the ${DESK_NAME[desk.role]}`); if (r) onDone(); };
  return (
    <Modal title={`${desk.assigned ? 'Change' : 'Assign'} employee · ${DESK_NAME[desk.role]}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!pick} onClick={save}>{desk.assigned ? 'Change employee' : 'Assign employee'}</Button></>}>
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>{desk.assigned ? <>The {DESK_NAME[desk.role]} is held by <b>{desk.personName || desk.name}</b>. Choose who holds it now.</> : 'Choose the employee who runs this desk.'} The login id <b>{desk.loginId}</b> and its password stay the same. {desk.role === 'staff' ? 'The employee keeps their own job title and the Staff portal opens for them.' : 'The employee\'s job title becomes the desk\'s title.'}</p>
        <Async skeleton="form" keep state={people}>{() => (free.length
          ? <Field label="Employee" hint="Active staff who do not have a login or another desk. Drivers and conductors cannot hold an officer desk."><Select value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Choose an employee" options={free.map((p) => ({ value: p._id, label: `${p.name} · ${[p.staffId, p.designation].filter(Boolean).join(' · ')}` }))} /></Field>
          : <div className="alert">There is nobody free on the staff list. Add the person first under Employees, then come back.</div>)}</Async>
      </div>
    </Modal>
  );
}
