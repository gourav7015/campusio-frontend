import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { patch } from '../../api/client.js';
import { Async, Badge, Button, Card, DataTable, Empty, Input, PageHeader, Select, Tabs, useDebounced, fmtDate } from '../../components/ui.jsx';
import FormModal from '../../components/FormModal.jsx';
import StaffLeaveDesk from '../../components/StaffLeaveDesk.jsx';
import HelpDesk from '../shared/HelpDesk.jsx';

const S = '/api/staff';

export { default as StaffDashboard } from './StaffDashboard';

/** The Staff portal is the office desk: attendance, leave of non-teaching staff, the employee list and the queries teachers send to the office. */
export function StaffLeaveDeskPage() {
  return (
    <div className="stack">
      <PageHeader title="Leave of non-teaching staff" subtitle="Record the leave of a non-teaching staff member who is away. It is approved at once and fills the attendance register for those days. Teachers apply for their own leave; the School Admin approves it." />
      <StaffLeaveDesk base={`${S}/leave`} staffBase={`${S}/people`} canEdit canRecord />
    </div>
  );
}

export function StaffQueries() {
  return <HelpDesk noun="query" handler base={`${S}/queries`} title="Teachers' queries" subtitle="Questions teachers have sent to the office: their attendance, their leave, and anything else. Answer here; the teacher gets the reply in their portal." />;
}

const TABS = [['teaching', 'Teachers'], ['non_teaching', 'Non-teaching staff'], ['office', 'Officers']];
export function StaffEmployees() {
  const [tab, setTab] = useState('teaching'); const [q, setQ] = useState(''); const [designation, setDesignation] = useState('');
  const dq = useDebounced(q);
  const list = useApi(`${S}/employees`, { category: tab, q: dq || undefined, designation: designation || undefined });
  return (
    <div className="stack">
      <PageHeader title="Employees" subtitle="Everyone who works at the school, except the transport crew, who are looked after by the Transport officer." />
      <div className="row between wrap" style={{ alignItems: 'center' }}>
        <Tabs tabs={TABS} value={tab} onChange={(t) => { setTab(t); setDesignation(''); }} />
        <div className="row" style={{ gap: 10 }}>
          <Input aria-label="Search employees" placeholder="Search name, id or phone" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select aria-label="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="All designations" options={(list.data?.designations || []).map((d) => ({ value: d.name, label: `${d.name} (${d.n})` }))} />
        </div>
      </div>
      <Card flush><Async skeleton="datatable" state={list} empty={<Empty title="No one here yet" />}>{(d) => <DataTable rows={d.items} rowKey="id" empty="No one matches" columns={[
        { label: 'ID', key: 'code' }, { label: 'Name', render: (x) => <b>{x.name}</b> }, { label: 'Designation', render: (x) => <Badge>{x.designation || '—'}</Badge> },
        { label: 'Phone', render: (x) => x.phone || '—' }, { label: 'Joined', render: (x) => fmtDate(x.joiningDate, true) }, { label: 'Status', render: (x) => <Badge tone={x.status === 'active' ? 'green' : 'amber'}>{x.status}</Badge> },
      ]} />}</Async></Card>
    </div>
  );
}

export function StaffProfile() {
  const p = useApi(`${S}/profile`);
  const [edit, setEdit] = useState(false);
  return (
    <Async skeleton="facts" state={p}>{(x) => (
      <div className="stack" style={{ maxWidth: 720 }}>
        <PageHeader title="My profile" actions={<Button onClick={() => setEdit(true)}>Edit contact details</Button>} />
        <Card title="Details"><dl className="kv"><dt>Name</dt><dd>{x.name}</dd><dt>Staff id</dt><dd>{x.staffId}</dd><dt>Designation</dt><dd>{x.designation}</dd><dt>Joined</dt><dd>{fmtDate(x.joiningDate, true)}</dd><dt>Phone</dt><dd>{x.phone || '—'}</dd><dt>Address</dt><dd>{x.address || '—'}</dd></dl></Card>
        {edit && <FormModal title="Contact details" initial={x} fields={[{ name: 'phone', label: 'Phone' }, { name: 'address', label: 'Address', full: true }]} onClose={() => setEdit(false)} onSubmit={async (v) => { await patch(`${S}/profile`, v); p.reload(); return true; }} />}
      </div>)}</Async>
  );
}
