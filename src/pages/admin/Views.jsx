import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { post, patch } from '../../api/client.js';
import { Async, Badge, Button, Card, CredentialsModal, DataTable, Empty, PageHeader, Tabs, useAction, fmtDateTime, statusTone, label } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import { Expenses, Budgets } from '../finance/FinanceMore.jsx';
import { FinanceDashboard, FeeStructures, FeePolicy, StudentsDues, Payments, FinanceReports } from '../finance/Finance.jsx';
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
      <Tabs tabs={[['overview', 'Overview'], ['structures', 'Fee structures'], ['policy', 'Fee policy'], ['students', 'Students & dues'], ['payments', 'Payments'], ['reports', 'Reports'], ['expenses', 'Expenditure'], ['budgets', 'Budgets']]} value={tab} onChange={(t) => setSp({ tab: t })} />
      {tab === 'overview' && <FinanceDashboard readOnly />}{tab === 'structures' && <FeeStructures readOnly />}{tab === 'policy' && <FeePolicy readOnly />}{tab === 'students' && <StudentsDues readOnly />}{tab === 'payments' && <Payments readOnly />}{tab === 'expenses' && <Expenses readOnly />}{tab === 'budgets' && <Budgets readOnly />}{tab === 'reports' && <FinanceReports readOnly />}
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

/** Finance, Library and Transport logins are created here by the School Admin; those users create nobody. */
export function Staff() {
  const list = useApi('/api/school/staff');
  const [modal, setModal] = useState(false); const [creds, setCreds] = useState(null);
  const [run] = useAction();
  return (
    <div className="stack">
      <PageHeader title="Finance & library staff" subtitle="People who run the fee desk and the library. They see only their own desk — never marks, attendance or school settings." actions={<Button variant="primary" onClick={() => setModal(true)}>+ Add staff</Button>} />
      <Card flush><Async state={list} empty={<Empty title="No staff accounts yet" />}>{(rows) => <DataTable rows={rows} columns={[{ label: 'Name', render: (u) => <b>{u.name}</b> }, { label: 'Desk', render: (u) => <Badge tone={u.role === 'finance' ? 'green' : u.role === 'transport' ? 'amber' : 'blue'}>{label(u.role)}</Badge> }, { label: 'Login id', key: 'loginId' }, { label: 'Last sign-in', render: (u) => fmtDateTime(u.lastLoginAt) }, { label: 'Status', render: (u) => <Badge tone={statusTone(u.status === 'active' ? 'active' : 'rejected')}>{u.status}</Badge> },
        { label: '', render: (u) => <div className="row"><Button size="sm" onClick={async () => { const r = await run(() => post(`/api/school/staff/${u._id}/reset-password`)); if (r) setCreds(r); }}>Reset password</Button><Button size="sm" onClick={async () => { await run(() => patch(`/api/school/staff/${u._id}`, { status: u.status === 'active' ? 'disabled' : 'active' }), 'Updated'); list.reload(); }}>{u.status === 'active' ? 'Disable' : 'Enable'}</Button></div> }]} />}</Async></Card>
      {modal && <FormModal title="Add staff member" fields={[{ name: 'name', label: 'Full name', required: true }, { name: 'email', label: 'Email (login id)', type: 'email', required: true }, { name: 'role', label: 'Desk', type: 'select', required: true, options: [{ value: 'finance', label: 'Finance (fees & receipts)' }, { value: 'library', label: 'Library (books & loans)' }, { value: 'transport', label: 'Transport (buses, drivers & riders)' }] }]} onClose={() => setModal(false)} onSubmit={async (v) => { const r = await post('/api/school/staff', v); list.reload(); setCreds(r); return true; }} />}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} title="Staff account" />
    </div>
  );
}
